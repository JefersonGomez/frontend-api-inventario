import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Camera } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export function BarcodeScanner({ onScan }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const readerElement = document.getElementById("reader");
      
      if (readerElement && !scannerRef.current) {
        const html5QrCode = new Html5QrcodeScanner(
          "reader", 
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          false 
        );

        html5QrCode.render(
          (decodedText) => {
            onScan(decodedText);
            setIsOpen(false);
            if (scannerRef.current) {
              scannerRef.current.clear().catch(console.error);
              scannerRef.current = null;
            }
          },
          () => {}
        );

        scannerRef.current = html5QrCode;
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScan]);

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open && scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
          scannerRef.current = null;
        }
      }}
    >
      <DialogTrigger className="inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium border rounded-md hover:bg-accent transition-colors">
        <Camera className="w-4 h-4" />
        {t('movements.dialog.scan_button')}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('movements.dialog.scanning')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          <div id="reader" className="w-full max-w-[300px] min-h-[300px] border rounded-lg overflow-hidden bg-black"></div>
          <p className="mt-4 text-sm text-muted-foreground text-center">
            {t('movements.dialog.camera_permission')}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}