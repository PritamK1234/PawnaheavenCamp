import React, { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
}

const TimePicker: React.FC<TimePickerProps> = ({ value, onChange }) => {
  const [hour, setHour] = useState("02");
  const [minute, setMinute] = useState("00");
  const [period, setPeriod] = useState("PM");

  useEffect(() => {
    if (value) {
      const match = value.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (match) {
        setHour(match[1].padStart(2, "0"));
        setMinute(match[2].padStart(2, "0"));
        setPeriod(match[3].toUpperCase());
      }
    }
  }, [value]);

  const update = (h: string, m: string, p: string) => {
    onChange(`${h}:${m} ${p}`);
  };

  return (
    <div className="flex gap-2">
      {/* Hour */}
      <Select
        value={hour}
        onValueChange={(h) => {
          setHour(h);
          update(h, minute, period);
        }}
      >
        <SelectTrigger className="w-[70px] bg-white/5 border-white/10 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 12 }, (_, i) => {
            const val = (i + 1).toString().padStart(2, "0");
            return (
              <SelectItem key={val} value={val}>
                {val}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* Minute */}
      <Select
        value={minute}
        onValueChange={(m) => {
          setMinute(m);
          update(hour, m, period);
        }}
      >
        <SelectTrigger className="w-[70px] bg-white/5 border-white/10 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Array.from({ length: 60 }, (_, i) => {
            const val = i.toString().padStart(2, "0");
            return (
              <SelectItem key={val} value={val}>
                {val}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* AM / PM */}
      <Select
        value={period}
        onValueChange={(p) => {
          setPeriod(p);
          update(hour, minute, p);
        }}
      >
        <SelectTrigger className="w-[80px] bg-white/5 border-white/10 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default TimePicker;
