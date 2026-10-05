import React, { useMemo, useState } from 'react';
import { GraduationCap, RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChangeTicketModal } from '@/components/change-ticket/ChangeTicketModal';
import type { Flight } from '@/services/flightApi';

interface Props {
  flight: Flight;
  currentPrice: number;
  passengerCount?: number;
  /** Only show the STU button when the current search is not STU and departs from Korea */
  showStuCheck?: boolean;
  /** Re-run the current search with type = STU */
  onCheckStu?: () => void;
}

/** Map Flight (EN shape) -> VNA leg shape required by the modals */
function buildModalFlight(flight: Flight) {
  const chiều_đi = {
    nơi_đi: flight.departure.airport,
    nơi_đến: flight.arrival.airport,
    ngày_cất_cánh: flight.departure.date,
    giờ_cất_cánh: flight.departure.time,
    giờ_hạ_cánh: flight.landingTime || flight.arrival.time,
  };

  const chiều_về = flight.return
    ? {
        nơi_đi: flight.return.departure.airport,
        nơi_đến: flight.return.arrival.airport,
        ngày_cất_cánh: flight.return.departure.date,
        giờ_cất_cánh: flight.return.departure.time,
        giờ_hạ_cánh: flight.return.landingTime || flight.return.arrival.time,
      }
    : undefined;

  return { chiều_đi, chiều_về };
}

export const VNAFlightActions: React.FC<Props> = React.memo(
  ({ flight, showStuCheck, onCheckStu }) => {
    const [changeOpen, setChangeOpen] = useState(false);

    const modalFlight = useMemo(() => buildModalFlight(flight), [flight]);

    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    return (
      <>
        <TooltipProvider delayDuration={150}>
          <div className="flex items-center gap-1" onClick={stopPropagation}>
            {showStuCheck && onCheckStu && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Check giá STU"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCheckStu();
                    }}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-white/80 hover:bg-indigo-50 dark:bg-gray-800/80 dark:hover:bg-gray-700 transition-colors shadow-sm"
                  >
                    <GraduationCap className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Check giá STU</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Đổi vé"
                  onClick={(e) => {
                    e.stopPropagation();
                    setChangeOpen(true);
                  }}
                  className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-white/80 hover:bg-blue-50 dark:bg-gray-800/80 dark:hover:bg-gray-700 transition-colors shadow-sm"
                >
                  <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Đổi vé</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        {changeOpen && (
          <ChangeTicketModal
            isOpen={changeOpen}
            onClose={() => setChangeOpen(false)}
            flight={modalFlight}
          />
        )}
      </>
    );
  }
);

VNAFlightActions.displayName = 'VNAFlightActions';
