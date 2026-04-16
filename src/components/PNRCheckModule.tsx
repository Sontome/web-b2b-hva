import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";

interface PNRData {
  count: number;
  hang: string[];
  files: string[];
  status?: "pending" | "called" | "calling";
}

interface PNRCheckModuleProps {
  pnrInput: string;
}

export const PNRCheckModule = ({ pnrInput }: PNRCheckModuleProps) => {
  const [results, setResults] = useState<Record<string, PNRData>>({});
  const [isChecking, setIsChecking] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  const parsePNRs = (input: string): string[] => {
    const pnrs = input
      .toUpperCase()
      .split(/[\s,;\-]+/)
      .map((p) => p.trim())
      .filter((p) => /^[A-Za-z0-9]{6}$/.test(p));
    return [...new Set(pnrs)];
  };

  const handleCheck = async () => {
    const pnrs = parsePNRs(pnrInput);
    if (pnrs.length === 0) {
      toast.error("Vui lòng nhập ít nhất một mã PNR hợp lệ (6 ký tự)");
      return;
    }

    setIsChecking(true);
    try {
      const res = await fetch(
        `https://apilive.hanvietair.com/check-ready-ticket?pnrs=${pnrs.join(" ")}`,
        { headers: { accept: "application/json" } }
      );
      const json = await res.json();
      const data: Record<string, PNRData> = {};

      for (const pnr of pnrs) {
        if (json.data && json.data[pnr]) {
          data[pnr] = { ...json.data[pnr], status: "pending" };
        } else {
          data[pnr] = { count: 0, hang: [], files: [], status: "pending" };
        }
      }

      setResults(data);
      setHasChecked(true);
    } catch (err) {
      console.error("Check PNR error:", err);
      toast.error("Lỗi khi kiểm tra PNR");
    } finally {
      setIsChecking(false);
    }
  };

  const handleCallOriginalTickets = async () => {
    const zeroCountPNRs = Object.entries(results)
      .filter(([, d]) => d.count === 0 && d.status !== "called")
      .map(([pnr]) => pnr);

    if (zeroCountPNRs.length === 0) {
      toast.info("Không có PNR nào cần gọi mặt vé");
      return;
    }

    setIsCalling(true);

    for (const pnr of zeroCountPNRs) {
      setResults((prev) => ({
        ...prev,
        [pnr]: { ...prev[pnr], status: "calling" },
      }));

      try {
        const vjRes = await fetch(
          `https://apilive.hanvietair.com/sendmail_vj?pnr=${pnr}`,
          { headers: { accept: "application/json" } }
        );
        const vjText = await vjRes.text();

        if (vjText.trim() !== '"VJ"' && vjText.trim() !== "VJ") {
          await fetch(
            `https://apilive.hanvietair.com/sendmailvnamulti?code=${pnr}&ssid=sendmailmulti`,
            { headers: { accept: "application/json" } }
          );
        }
      } catch (err) {
        console.error(`Error calling ticket for ${pnr}:`, err);
      }

      setResults((prev) => ({
        ...prev,
        [pnr]: { ...prev[pnr], status: "called" },
      }));
    }

    setIsCalling(false);
    toast.success("Đã gọi mặt vé gốc cho tất cả PNR!");
  };

  if (!hasChecked) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCheck}
        disabled={isChecking}
        className="ml-2 shrink-0"
      >
        {isChecking ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Đang check...
          </>
        ) : (
          "Check"
        )}
      </Button>
    );
  }

  const pnrEntries = Object.entries(results);

  return (
    <div className="space-y-3">
      {/* Inline check button after first check */}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleCheck}
          disabled={isChecking}
        >
          {isChecking ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Đang check...
            </>
          ) : (
            "Check lại"
          )}
        </Button>

        <Button
          type="button"
          size="sm"
          onClick={handleCallOriginalTickets}
          disabled={isCalling || pnrEntries.every(([, d]) => d.count > 0 || d.status === "called")}
          className="bg-orange-500 hover:bg-orange-600 text-white"
        >
          {isCalling ? (
            <>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              Đang gọi...
            </>
          ) : (
            "Gọi mặt vé gốc"
          )}
        </Button>
      </div>

      {/* Results table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50 dark:bg-blue-950/30">
              <TableHead className="font-semibold text-xs">PNR</TableHead>
              <TableHead className="font-semibold text-xs">Hãng</TableHead>
              <TableHead className="font-semibold text-xs">Số người</TableHead>
              <TableHead className="font-semibold text-xs">Trạng thái</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pnrEntries.map(([pnr, data]) => {
              const isZero = data.count === 0;
              const isCalled = data.status === "called";
              const isCalling = data.status === "calling";

              let rowClass = "bg-blue-50/50 dark:bg-blue-950/10";
              if (isCalled) rowClass = "bg-green-50 dark:bg-green-950/20";
              else if (isCalling) rowClass = "bg-yellow-50 dark:bg-yellow-950/20";
              else if (isZero) rowClass = "bg-red-50 dark:bg-red-950/20";

              return (
                <TableRow key={pnr} className={rowClass}>
                  <TableCell className="font-mono font-semibold text-xs py-1.5">{pnr}</TableCell>
                  <TableCell className="text-xs py-1.5">{data.hang.length > 0 ? data.hang.join(", ") : "—"}</TableCell>
                  <TableCell className="text-xs py-1.5">
                    <span className="inline-flex items-center gap-1">
                      {data.count}
                      <User className="w-3 h-3" />
                    </span>
                  </TableCell>
                  <TableCell className="text-xs py-1.5">
                    {isCalling ? (
                      <span className="inline-flex items-center gap-1 text-yellow-600">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        Đang gọi...
                      </span>
                    ) : isCalled ? (
                      <span className="text-green-600 font-medium">✓ Đã gọi</span>
                    ) : isZero ? (
                      <span className="text-red-600 font-medium">Chưa có</span>
                    ) : (
                      <span className="text-green-600">Có sẵn</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
