#!/usr/bin/env python3
"""Add psfnew to pfSense HAProxy (pool + WEB-SSL ACL). Run from Mac with SSH tunnel to pfSense."""
import os
import re
import sys
from urllib.parse import urljoin, urlencode
from urllib.request import Request, build_opener, HTTPCookieProcessor

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:18080"
USER = os.environ.get("PFSENSE_USER", "admin")
PASS = os.environ.get("PFSENSE_PASS", "")
POOL_NAME = "psfnew"
POOL_PORT = "2087"
HOST_ACL = "psfnew.nchads.gov.kh"

opener = build_opener(HTTPCookieProcessor())


def http_get(url):
    return opener.open(url, timeout=60).read().decode("utf-8", "replace")


def http_post(url, data: dict):
    body = urlencode(data, doseq=True).encode()
    req = Request(url, data=body, method="POST")
    return opener.open(req, timeout=120).read().decode("utf-8", "replace")


def parse_form(html):
    data = {}
    for m in re.finditer(r"<input[^>]+name=['\"]([^'\"]+)['\"][^>]*>", html, re.I):
        tag = m.group(0)
        name = m.group(1)
        vm = re.search(r"value=['\"]([^'\"]*)['\"]", tag, re.I)
        val = vm.group(1) if vm else ""
        tm = re.search(r"type=['\"]([^'\"]+)['\"]", tag, re.I)
        typ = tm.group(1).lower() if tm else "text"
        if typ == "checkbox":
            if re.search(r"\bchecked\b", tag, re.I):
                if name.endswith("[]"):
                    data.setdefault(name, []).append(val)
                else:
                    data[name] = val
            continue
        if name.endswith("[]"):
            data.setdefault(name, []).append(val)
        else:
            data[name] = val
    for m in re.finditer(
        r"<select[^>]+name=['\"]([^'\"]+)['\"][^>]*>(.*?)</select>", html, re.I | re.S
    ):
        name = m.group(1)
        opts = m.group(2)
        sm = re.search(r"<option[^>]*value=['\"]([^'\"]*)['\"][^>]*\bselected\b", opts, re.I)
        if not sm:
            sm = re.search(r"<option[^>]*\bselected\b[^>]*value=['\"]([^'\"]*)['\"]", opts, re.I)
        data[name] = sm.group(1) if sm else ""
    return data


def login():
    r = http_get(urljoin(BASE, "/index.php"))
    m = re.search(r"name='__csrf_magic'\s+value=\"([^\"]+)\"", r)
    if not m:
        raise SystemExit("csrf not found on login")
    http_post(
        urljoin(BASE, "/index.php"),
        {
            "__csrf_magic": m.group(1),
            "usernamefld": USER,
            "passwordfld": PASS,
            "login": "Sign In",
        },
    )


def pool_exists():
    r = http_get(urljoin(BASE, "/haproxy/haproxy_pools.php"))
    return POOL_NAME in r


def create_pool():
    if pool_exists():
        print(f"Pool {POOL_NAME} already exists")
        return
    r = http_get(urljoin(BASE, "/haproxy/haproxy_pool_edit.php"))
    data = parse_form(r)
    data["name"] = POOL_NAME
    data["save"] = "Save"
    data["tableA_servers_row[]"] = ["0"]
    data["tableA_servers_rowindex[]"] = ["0"]
    data["tableA_serversname0"] = POOL_NAME
    data["tableA_serversaddress0"] = "192.168.0.16"
    data["tableA_serversport0"] = POOL_PORT
    data["tableA_serversstatus0"] = "active"
    data["tableA_serversforwardto0"] = ""
    data["check_type"] = "HTTP"
    data["monitor_uri"] = "/"
    r2 = http_post(urljoin(BASE, "/haproxy/haproxy_pool_edit.php"), data)
    print("create pool", POOL_NAME in r2)


def frontend_has_psfnew():
    r = http_get(urljoin(BASE, "/haproxy/haproxy_listeners_edit.php?id=WEB-SSL"))
    return "psfnew.nchads.gov.kh" in r


def clone_row(data, prefix, src: str, dst: str, overrides: dict):
    """Clone pfSense table_* fields ending with src index to dst index."""
    pat = re.compile(rf"^({re.escape(prefix)}\w+){re.escape(src)}$")
    for k, v in list(data.items()):
        m = pat.match(k)
        if not m:
            continue
        nk = f"{m.group(1)}{dst}"
        data[nk] = overrides.get(nk, v)


def add_web_ssl_acl():
    if frontend_has_psfnew():
        print("WEB-SSL already has psfnew ACL")
        return
    r = http_get(urljoin(BASE, "/haproxy/haproxy_listeners_edit.php?id=WEB-SSL"))
    data = parse_form(r)
    data["table_extaddrextaddr0"] = data.get("table_extaddrextaddr0") or "wan_ipv4"
    data["table_extaddrextaddr_port0"] = data.get("table_extaddrextaddr_port0") or "443"
    data["table_extaddrextaddr_ssl0"] = "yes"
    acl_idx = "5"
    act_idx = "9"

    clone_row(data, "table_acls", "2", acl_idx, {
        f"table_aclsname{acl_idx}": "psfnew",
        f"table_aclsvalue{acl_idx}": HOST_ACL,
        f"table_aclsexpression{acl_idx}": "host_starts_with",
    })
    clone_row(data, "table_actions", "6", act_idx, {
        f"table_actionsaction{act_idx}": "use_backend",
        f"table_actionsacl{act_idx}": "psfnew",
        f"table_actionsuse_backendbackend{act_idx}": POOL_NAME,
    })

    for key, idx in (("table_acls_row[]", acl_idx), ("table_acls_rowindex[]", acl_idx),
                     ("table_actions_row[]", act_idx), ("table_actions_rowindex[]", act_idx)):
        rows = data.get(key, [])
        if isinstance(rows, str):
            rows = [rows]
        if idx not in rows:
            rows.append(idx)
        data[key] = rows

    data["save"] = "Save"
    r2 = http_post(urljoin(BASE, "/haproxy/haproxy_listeners_edit.php?id=WEB-SSL"), data)
    print("WEB-SSL update", HOST_ACL in r2)


def apply_haproxy():
    r = http_get(urljoin(BASE, "/haproxy/haproxy_listeners.php"))
    m = re.search(r"name='__csrf_magic'\s+value=\"([^\"]+)\"", r)
    if not m:
        print("no csrf for apply")
        return
    http_post(
        urljoin(BASE, "/haproxy/haproxy_listeners.php"),
        {"__csrf_magic": m.group(1), "apply": "Apply Changes"},
    )
    print("applied haproxy changes")


def fix_pool_health():
    r = http_get(urljoin(BASE, f"/haproxy/haproxy_pool_edit.php?id={POOL_NAME}"))
    data = parse_form(r)
    data["check_type"] = "none"
    data["save"] = "Save"
    http_post(urljoin(BASE, f"/haproxy/haproxy_pool_edit.php?id={POOL_NAME}"), data)
    print("pool health check disabled")


def main():
    if not PASS:
        raise SystemExit("Set PFSENSE_PASS (pfSense admin password) before running.")
    login()
    create_pool()
    fix_pool_health()
    add_web_ssl_acl()
    apply_haproxy()


if __name__ == "__main__":
    main()
