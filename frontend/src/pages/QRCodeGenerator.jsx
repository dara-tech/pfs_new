import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Badge } from '../components/ui/badge';
import { QRCodeSVG } from 'qrcode.react';
import { FaQrcode, FaDownload, FaPrint } from 'react-icons/fa';
import { useUIStore } from '../lib/stores/uiStore';
import api from '../lib/api';
import { t } from '../lib/translations/index';
import PageToolbar from '../components/PageToolbar';

export default function QRCodeGenerator() {
  const { locale } = useUIStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sites, setSites] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [selectedType, setSelectedType] = useState('client'); // 'client' or 'provider'
  const [baseUrl, setBaseUrl] = useState('');

  useEffect(() => {
    loadData();
    // Get base URL for QR codes
    const currentUrl = window.location.origin;
    setBaseUrl(currentUrl);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sitesResponse, tokensResponse] = await Promise.all([
        api.get('/questionnaire/sites').catch(() => null),
        api.get('/questionnaire/tokens').catch(() => null)
      ]);

      if (sitesResponse?.data) {
        const sitesData = sitesResponse.data.sites || sitesResponse.data || [];
        setSites(sitesData);
      }
      if (tokensResponse?.data) {
        const tokensData = tokensResponse.data.tokens || tokensResponse.data || [];
        setTokens(tokensData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate QR code URL for a site
  const generateQRUrl = (tokenCode, locale = 'kh') => {
    return `${baseUrl}/${selectedType}/${tokenCode}/${locale}`;
  };

  // Download QR code as PNG
  const downloadQR = (tokenCode, siteName) => {
    const svg = document.getElementById(`qr-${tokenCode}`);
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const url = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `${selectedType}-${tokenCode}-${siteName || tokenCode}.png`;
        link.href = url;
        link.click();
      };
      
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
  };

  // Print all QR codes
  const printAllQR = () => {
    window.print();
  };

  // Get site name for a token
  const getSiteName = (tokenCode) => {
    const token = tokens.find(t => t.code === tokenCode);
    if (!token) return tokenCode;
    const site = sites.find(s => s.username === token.username);
    if (!site) return tokenCode;
    return locale === 'kh' ? (site.site_kh || site.site || site.sitename) : (site.site_en || site.sitename || site.site);
  };

  // Get unique tokens with their sites
  const getTokenSites = () => {
    const tokenSites = [];
    tokens.forEach(token => {
      const site = sites.find(s => s.username === token.username);
      if (site) {
        tokenSites.push({
          token: token.code,
          site: site,
          username: token.username
        });
      }
    });
    return tokenSites;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const tokenSites = getTokenSites();

  return (
    <div className="page-stack page-stack-lg">
      <PageToolbar>
        <Button
          variant="outline"
          onClick={() => setSelectedType('client')}
          className={selectedType === 'client' ? 'bg-primary text-primary-foreground' : ''}
        >
          {locale === 'kh' ? 'អ្នកជំងឺ' : 'Client'}
        </Button>
        <Button
          variant="outline"
          onClick={() => setSelectedType('provider')}
          className={selectedType === 'provider' ? 'bg-primary text-primary-foreground' : ''}
        >
          {locale === 'kh' ? 'បុគ្គលិក' : 'Provider'}
        </Button>
      </PageToolbar>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FaQrcode />
            {locale === 'kh' 
              ? `QR Codes - ${selectedType === 'client' ? 'អ្នកជំងឺ' : 'បុគ្គលិក'}`
              : `QR Codes - ${selectedType === 'client' ? 'Client' : 'Provider'}`}
          </CardTitle>
          <CardDescription>
            {locale === 'kh'
              ? 'ស្កេន QR Code ដើម្បីចូលកម្រងសំណួរ'
              : 'Scan QR code to access questionnaire'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tokenSites.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {locale === 'kh' ? 'មិនមានតំបន់' : 'No sites found'}
            </div>
          ) : (
            <>
              <div className="flex justify-end gap-2 mb-4 print:hidden">
                <Button variant="outline" onClick={printAllQR}>
                  <FaPrint className="mr-2" />
                  {locale === 'kh' ? 'បោះពុម្ពទាំងអស់' : 'Print All'}
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print:grid-cols-3">
                {tokenSites.map(({ token, site }) => {
                  const siteName = locale === 'kh' 
                    ? (site.site_kh || site.site || site.sitename)
                    : (site.site_en || site.sitename || site.site);
                  const qrUrl = generateQRUrl(token, locale);
                  
                  return (
                    <Card key={token} className="print:break-inside-avoid">
                      <CardContent className="p-4">
                        <div className="flex flex-col items-center space-y-3">
                          <div className="bg-white p-3 rounded-lg">
                            <QRCodeSVG
                              id={`qr-${token}`}
                              value={qrUrl}
                              size={150}
                              level="H"
                              includeMargin={true}
                            />
                          </div>
                          <div className="text-center space-y-1">
                            <p className="font-semibold text-sm">{siteName}</p>
                            <p className="text-xs text-muted-foreground">{token}</p>
                            <Badge variant="secondary" className="mt-1">
                              {selectedType === 'client' 
                                ? (locale === 'kh' ? 'អ្នកជំងឺ' : 'Client')
                                : (locale === 'kh' ? 'បុគ្គលិក' : 'Provider')}
                            </Badge>
                          </div>
                          <div className="flex gap-2 print:hidden">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadQR(token, siteName)}
                            >
                              <FaDownload className="mr-1" size={12} />
                              {locale === 'kh' ? 'ទាញយក' : 'Download'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
