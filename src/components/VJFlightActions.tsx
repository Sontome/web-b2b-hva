import React, { useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChangeTicketVJModal } from '@/components/change-ticket-vj/ChangeTicketVJModal';
import type { Flight } from '@/services/flightApi';

interface Props {
  flight: Flight;
}

/** Map Flight (EN shape) -> VJ leg shape required by the VJ change modal */
function buildModalFlight(flight: Flight) {
  const stripPrefix = (fn: string) => fn.replace(/^VJ/i, '');

  const chiều_đi = {
    nơi_đi: flight.departure.airport,
    nơi_đến: flight.arrival.airport,
    ngày_cất_cánh: flight.departure.date,
    giờ_cất_cánh: flight.departure.time,
    giờ_hạ_cánh: flight.landingTime || flight.arrival.time,
    id: stripPrefix(flight.flightNumber),
    số_hiệu_máy_bay: flight.new_flight_no,
  };

  const chiều_về = flight.return
    ? {
        nơi_đi: flight.return.departure.airport,
        nơi_đến: flight.return.arrival.airport,
        ngày_cất_cánh: flight.return.departure.date,
        giờ_cất_cánh: flight.return.departure.time,
        giờ_hạ_cánh: flight.return.landingTime || flight.return.arrival.time,
        id: stripPrefix(flight.flightNumber),
        số_hiệu_máy_bay: flight.new_flight_arr_no,
      }
    : undefined;

  return { chiều_đi, chiều_về };
}

export const VJFlightActions: React.FC<Props> = React.memo(({ flight }) => {
  const [changeOpen, setChangeOpen] = useState(false);
  const modalFlight = useMemo(() => buildModalFlight(flight), [flight]);

  const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <>
      <TooltipProvider delayDuration={150}>
        <div className="flex items-center gap-1" onClick={stopPropagation}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Đổi vé"
                onClick={(e) => {
                  e.stopPropagation();
                  setChangeOpen(true);
                }}
                className="h-9 w-9 inline-flex items-center justify-center rounded-md bg-white/80 hover:bg-red-50 dark:bg-gray-800/80 dark:hover:bg-gray-700 transition-colors shadow-sm"
              >
                <RefreshCw className="h-5 w-5 text-red-600 dark:text-red-400" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Đổi vé</TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {changeOpen && (
        <ChangeTicketVJModal
          isOpen={changeOpen}
          onClose={() => setChangeOpen(false)}
          flight={modalFlight}
        />
      )}
    </>
  );
});

VJFlightActions.displayName = 'VJFlightActions';
