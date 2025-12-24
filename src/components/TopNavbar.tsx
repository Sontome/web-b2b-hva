import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { TrendingDown, ShoppingBasket, Wrench, Home } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserProfileDropdown } from "@/components/UserProfileDropdown";

interface TopNavbarProps {
  onShowPNRModal?: () => void;
  onShowEmailModal?: () => void;
  onShowVJTicketModal?: () => void;
  onShowVNATicketModal?: () => void;
}

export const TopNavbar = ({
  onShowPNRModal,
  onShowEmailModal,
  onShowVJTicketModal,
  onShowVNATicketModal,
}: TopNavbarProps) => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-gradient-to-r from-teal-700 to-teal-600 dark:from-teal-800 dark:to-teal-700 shadow-lg backdrop-blur-sm transition-all duration-100">
      <div className="container mx-auto px-6 py-3">
        <div className="flex justify-between items-center">
          <div className="transition-all duration-200 cursor-pointer" onClick={() => navigate('/')}>
            <h1 className="text-2xl font-bold text-white">
              Hàn Việt Air
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="chase-border-btn text-white hover:bg-white/20 transition-all flex items-center gap-2 px-4 py-2"
            >
              <Home className="w-5 h-5" />
              <span className="hidden sm:inline">Trang Chủ</span>
            </Button>
            {profile?.perm_check_discount === true && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/price-monitor')}
                className="chase-border-btn text-white hover:bg-white/20 transition-all flex items-center gap-2 px-4 py-2"
              >
                <TrendingDown className="w-5 h-5" />
                <span className="hidden sm:inline">Tool Check Vé Giảm</span>
              </Button>
            )}
            {profile?.perm_hold_ticket === true && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/cart')}
                className="chase-border-btn text-white hover:bg-white/20 transition-all flex items-center gap-2 px-4 py-2"
              >
                <ShoppingBasket className="w-5 h-5" />
                <span className="hidden sm:inline">Giỏ hàng</span>
              </Button>
            )}
            {(profile?.perm_get_ticket_image || profile?.perm_send_ticket || profile?.perm_get_pending_ticket) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="chase-border-btn text-white hover:bg-white/20 transition-all flex items-center gap-2 px-4 py-2"
                  >
                    <Wrench className="w-5 h-5" />
                    <span className="hidden sm:inline">Tiện ích</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-background z-[200]" align="end">
                  {profile?.perm_get_ticket_image && onShowPNRModal && (
                    <DropdownMenuItem onClick={onShowPNRModal}>
                      Lấy ảnh mặt vé
                    </DropdownMenuItem>
                  )}
                  {profile?.perm_send_ticket && onShowEmailModal && (
                    <DropdownMenuItem onClick={onShowEmailModal}>
                      Gửi mặt vé
                    </DropdownMenuItem>
                  )}
                  {profile?.perm_get_pending_ticket && onShowVJTicketModal && onShowVNATicketModal && (
                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        Lấy ảnh mặt vé chờ
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="bg-background z-[210]">
                        <DropdownMenuItem onClick={onShowVJTicketModal}>
                          VietJet
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onShowVNATicketModal}>
                          Vietnam Airlines
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <UserProfileDropdown />
          </div>
        </div>
      </div>
    </header>
  );
};
