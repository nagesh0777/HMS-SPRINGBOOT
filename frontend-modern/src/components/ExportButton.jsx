import React, { useState } from 'react';
import axios from 'axios';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/Toast';

/**
 * Downloads a CSV from an authenticated endpoint.
 *
 * A plain <a href> cannot be used: the API requires a bearer token, and a link sends no
 * Authorization header. So the file is fetched as a blob with the interceptor's token attached,
 * then handed to the browser via an object URL.
 *
 * The object URL is revoked afterwards — without that, every export pins its own copy of the
 * file in memory for the life of the tab, which for a 50,000-row patient export is real.
 */
export default function ExportButton({
  url,
  label = 'Export CSV',
  filename,
  variant = 'outline',
  size = 'sm',
  className,
  disabled,
}) {
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const download = async () => {
    setBusy(true);
    try {
      const res = await axios.get(url, { responseType: 'blob' });

      // Prefer the filename the server chose — it carries the date and patient code.
      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^"]+)"?/);
      const name = match ? match[1] : filename || 'export.csv';

      const objectUrl = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objectUrl);

      showToast(`Downloaded ${name}`, 'success');
    } catch (e) {
      const status = e?.response?.status;
      showToast(
        status === 403 ? 'You do not have permission to export this.'
          : status === 404 ? 'Nothing found to export.'
          : 'Export failed. Please try again.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button variant={variant} size={size} onClick={download} disabled={busy || disabled} className={className}>
      {busy ? <Loader2 className="animate-spin" /> : <Download />}
      {busy ? 'Preparing…' : label}
    </Button>
  );
}
