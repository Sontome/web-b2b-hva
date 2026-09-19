import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { SunUpdatePnrPanel } from '@/components/update-pnr/SunUpdatePnrPanel';
import { Plane } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const UpdatePnrModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [airline, setAirline] = useState<'SUN' | null>(null);

  useEffect(() => {
    if (!isOpen) setAirline(null);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>
            {airline === 'SUN' ? 'Cập nhật PNR - SunPQ' : 'Cập nhật PNR'}
          </DialogTitle>
        </DialogHeader>

        {!airline ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Chọn hãng cần cập nhật thông tin PNR:</p>
            <Button
              variant="outline"
              className="h-24 w-24 flex-col gap-2"
              onClick={() => setAirline('SUN')}
            >
              <Plane className="h-6 w-6" />
              <span className="font-semibold">SUN</span>
            </Button>
          </div>
        ) : (
          <SunUpdatePnrPanel onBack={() => setAirline(null)} />
        )}
      </DialogContent>
    </Dialog>
  );
};
