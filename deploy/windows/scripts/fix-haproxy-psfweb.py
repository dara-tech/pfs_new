#!/usr/bin/env python3
"""Restore psfweb HAProxy routing on pfSense WEB-SSL frontend."""
import os
import re
import sys
from urllib.parse import urlencode, urljoin
from urllib.request import HTTPCookieProcessor, Request, build_opener

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:18080"
USER = os.environ.get("PFSENSE_USER", "admin")
PASS = os.environ.get("PFSENSE_PASS", "")

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


def fix_psfweb_action():
    r = http_get(urljoin(BASE, "/haproxy/haproxy_listeners_edit.php?id=WEB-SSL"))
    data = parse_form(r)
    data["table_actionsaction8"] = "use_backend"
    data["table_actionsacl8"] = "PSFWEB"
    data["table_actionsuse_backendbackend8"] = "PSFWEB"
    rows = data.get("table_actions_row[]", [])
    if isinstance(rows, str):
        rows = [rows]
    if "8" not in rows:
        rows.append("8")
    data["table_actions_row[]"] = rows
    idx = data.get("table_actions_rowindex[]", [])
    if isinstance(idx, str):
        idx = [idx]
    if "8" not in idx:
        idx.append("8")
    data["table_actions_rowindex[]"] = idx
    data["save"] = "Save"
    r2 = http_post(urljoin(BASE, "/haproxy/haproxy_listeners_edit.php?id=WEB-SSL"), data)
    ok = "PSFWEB" in r2 and "table_actionsuse_backendbackend8" in r2
    print("restore PSFWEB action row 8:", ok)


def fix_psfweb_pool_health():
    r = http_get(urljoin(BASE, "/haproxy/haproxy_pool_edit.php?id=PSFWEB"))
    data = parse_form(r)
    data["check_type"] = "none"
    data["save"] = "Save"
    http_post(urljoin(BASE, "/haproxy/haproxy_pool_edit.php?id=PSFWEB"), data)
    print("PSFWEB pool health check disabled")


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


def main():
    if not PASS:
        raise SystemExit("Set PFSENSE_PASS before running.")
    login()
    fix_psfweb_action()
    fix_psfweb_pool_health()
    apply_haproxy()


if __name__ == "__main__":
    main()
