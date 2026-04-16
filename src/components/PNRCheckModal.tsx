import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Copy, Download, FileText } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { PNRCheckModule } from "@/components/PNRCheckModule";
interface PNRCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PNRFile {
  url: string;
  name: string;
  blob?: Blob;
}

export const PNRCheckModal = ({
  isOpen,
  onClose,
}: PNRCheckModalProps) => {
  const [pnrCode, setPnrCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<PNRFile[]>([]);
  const [banner, setBanner] = useState(' ');

  const { user } = useAuth();

  const handleClose = () => {
    setPnrCode('');
    setFiles([]);
    onClose();
  };

  // ==================================
  // Load banner user
  // ==================================
  const loadUserBanner = async () => {
    if (!user?.id) return;

    const { data } = await supabase
      .from('profiles')
      .select('banner')
      .eq('id', user.id)
      .single();

    setBanner(data?.banner || ' ');
  };

  useEffect(() => {
    if (isOpen) {
      loadUserBanner();
    }
  }, [isOpen]);

  // ==================================
  // Parse nhiều PNR
  // ==================================
  const parsePNRs = (input: string): string[] => {
    const pnrs = input
      .toUpperCase()
      .split(/[\s,;\n\r]+/)
      .map((p) => p.trim())
      .filter((p) => /^[A-Z0-9]{6}$/.test(p));

    return [...new Set(pnrs)];
  };

  // ==================================
  // Check nhiều PNR
  // ==================================
  const handleCheck = async () => {
    const pnrs = parsePNRs(pnrCode);

    if (pnrs.length === 0) {
      toast.error('Vui lòng nhập ít nhất 1 PNR hợp lệ');
      return;
    }

    setIsLoading(true);
    setFiles([]);

    try {
      const listResponse = await fetch(
        'https://apilive.hanvietair.com/list-pnr-v2',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pnr: pnrs.join(' '), // 🔥 nhiều PNR cách nhau bằng space
            banner: banner,
          }),
        }
      );

      const listResult = await listResponse.json();

      if (!listResult.files || !Array.isArray(listResult.files)) {
        toast.error('Không tìm thấy file nào');
        return;
      }

      toast.success(
        `Tìm thấy ${listResult.files.length} file từ ${pnrs.length} PNR`
      );

      const resultFiles: PNRFile[] = [];

      for (const fileUrl of listResult.files) {
        try {
          const fileResponse = await fetch(fileUrl);

          if (fileResponse.ok) {
            const blob = await fileResponse.blob();

            const fileName =
              fileUrl.split('/').pop() || 'document.png';

            resultFiles.push({
              url: fileUrl,
              name: fileName,
              blob,
            });
          }
        } catch (error) {
          console.error('Error fetching:', fileUrl, error);
        }
      }

      setFiles(resultFiles);

      if (resultFiles.length === 0) {
        toast.error('Không tải được file nào');
      }
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi kiểm tra');
    } finally {
      setIsLoading(false);
    }
  };

  // ==================================
  // Copy PNG
  // ==================================
  const handleCopyFile = async (file: PNRFile) => {
    if (!file.blob) {
      toast.error('Không có file để copy');
      return;
    }

    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': file.blob,
        }),
      ]);

      toast.success('Đã copy ảnh PNG');
    } catch (err) {
      console.error(err);
      toast.error('Trình duyệt không hỗ trợ copy');
    }
  };

  // ==================================
  // Download
  // ==================================
  const handleDownload = (file: PNRFile) => {
    if (!file.blob) return;

    const url = URL.createObjectURL(file.blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;

    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);

    toast.success('Đã tải xuống file');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kiểm tra mã PNR</DialogTitle>
          <DialogDescription>
            Nhập nhiều PNR cách nhau bằng dấu cách / Enter
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Row input + buttons */}
          <div className="flex items-end gap-2">
            {/* Input block */}
            <div className="flex-1">
              <Label htmlFor="pnr">Mã PNR</Label>
        
              <Input
                id="pnr"
                value={pnrCode}
                onChange={(e) =>
                  setPnrCode(e.target.value.toUpperCase())
                }
                placeholder="VD: ABC123 XYZ789 DEF456"
                className="uppercase"
              />
            </div>
        
            {/* Nút Check mặt vé */}
            <div className="shrink-0">
              <PNRCheckModule pnrInput={pnrCode} />
            </div>
        
            {/* Nút Kiểm tra */}
            <div className="shrink-0">
              <Button
                onClick={handleCheck}
                disabled={isLoading || !pnrCode.trim()}
                className="whitespace-nowrap"
              >
                {isLoading ? "Đang kiểm tra..." : "Kiểm tra"}
              </Button>
            </div>
          </div>

          {/* FILES */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">
                Danh sách file ({files.length})
              </h3>

              <div className="grid gap-3">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-5 w-5 text-red-600" />
                        <span className="font-medium text-sm">
                          {file.name}
                        </span>
                      </div>

                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleCopyFile(file)
                          }
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copy
                        </Button>

                        <Button
                          size="sm"
                          onClick={() =>
                            handleDownload(file)
                          }
                          disabled={!file.blob}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Tải xuống
                        </Button>
                      </div>
                    </div>

                    {file.blob && (
                      <div className="mt-3">
                        <img
                          src={URL.createObjectURL(file.blob)}
                          className="w-full h-[1000px] object-contain border rounded"
                          alt={file.name}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div className="flex justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
