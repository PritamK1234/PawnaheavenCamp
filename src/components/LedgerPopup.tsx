import { format } from "date-fns";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface LedgerPopupProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  propertyName: string;
  availablePersons: number;
  totalPersons: number;
}

export const LedgerPopup = ({
  isOpen,
  onClose,
  date,
  propertyName,
  availablePersons,
  totalPersons,
}: LedgerPopupProps) => {
  if (!date) return null;

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="bg-charcoal border-white/10 rounded-t-[2rem]">
        <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-white/10 my-4" />
        
        <DrawerHeader className="px-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1 text-left">
              <DrawerTitle className="text-gold font-display text-2xl tracking-tight">
                {propertyName}
              </DrawerTitle>
              <DrawerDescription className="text-white/60 font-medium">
                {format(date, 'dd MMM yyyy')}
              </DrawerDescription>
            </div>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon" className="text-white/40 hover:text-white hover:bg-white/5 rounded-full">
                <X className="w-5 h-5" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="px-6 py-4">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Availability Status</p>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-[#00FF41]">{availablePersons}</span>
                <span className="text-white/20 text-xl font-light">/</span>
                <span className="text-xl font-bold text-[#FFA500]">{totalPersons}</span>
                <span className="text-white/60 text-xs ml-1">Persons</span>
              </div>
            </div>
            <div className="h-10 w-10 rounded-full border-2 border-[#00FF41]/20 flex items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-[#00FF41]/20 animate-pulse" />
            </div>
          </div>
        </div>

        <DrawerFooter className="px-6 pb-10">
          <p className="text-center text-[10px] text-white/20 uppercase font-bold tracking-[0.2em]">
            Daily Booking Ledger
          </p>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
