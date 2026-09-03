"use client";

import React from "react";
import { Settings, X, Volume2, Video, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DeviceInfo } from "@/hooks/use-falcon-meeting-engine";

interface DeviceSettingsModalProps {
  isOpen: boolean;
  audioDevices: DeviceInfo[];
  videoDevices: DeviceInfo[];
  selectedAudioDevice: string;
  selectedVideoDevice: string;
  audioLevel: number;
  onSelectAudioDevice: (id: string) => void;
  onSelectVideoDevice: (id: string) => void;
  onClose: () => void;
}

export function DeviceSettingsModal({
  isOpen,
  audioDevices,
  videoDevices,
  selectedAudioDevice,
  selectedVideoDevice,
  audioLevel,
  onSelectAudioDevice,
  onSelectVideoDevice,
  onClose,
}: DeviceSettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150">
      <div className="bg-white border border-[#DADCE0] rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E8EAED] pb-3">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-[#1A73E8]" />
            <h3 className="text-sm sm:text-base font-bold text-[#202124]">Audio & Video Settings</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="h-8 w-8 rounded-full flex items-center justify-center text-[#5F6368] hover:text-[#202124] hover:bg-[#F1F3F4] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Device Selectors */}
        <div className="space-y-4 text-xs">
          {/* Microphone */}
          <div>
            <label className="text-[#5F6368] font-bold flex items-center gap-1.5 mb-1.5">
              <Mic className="h-3.5 w-3.5 text-[#1A73E8]" />
              <span>Microphone</span>
            </label>
            <select
              value={selectedAudioDevice}
              onChange={(e) => onSelectAudioDevice(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-[#DADCE0] text-[#202124] rounded-xl px-3 py-2 text-xs focus:outline-hidden font-medium"
            >
              {audioDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>

            {/* Live Audio VU Meter */}
            <div className="mt-2 flex items-center gap-2 bg-[#F8F9FA] px-3 py-2 rounded-xl border border-[#DADCE0]">
              <Volume2 className="h-3.5 w-3.5 text-[#1E8E3E] shrink-0" />
              <div className="flex-1 h-1.5 bg-[#E8EAED] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#1E8E3E] transition-all duration-75 rounded-full"
                  style={{ width: `${audioLevel}%` }}
                />
              </div>
              <span className="text-[10px] text-[#5F6368] font-mono">Input Level</span>
            </div>
          </div>

          {/* Camera */}
          <div>
            <label className="text-[#5F6368] font-bold flex items-center gap-1.5 mb-1.5">
              <Video className="h-3.5 w-3.5 text-[#1A73E8]" />
              <span>Camera</span>
            </label>
            <select
              value={selectedVideoDevice}
              onChange={(e) => onSelectVideoDevice(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-[#DADCE0] text-[#202124] rounded-xl px-3 py-2 text-xs focus:outline-hidden font-medium"
            >
              {videoDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>

          {/* Connection Diagnostics */}
          <div className="bg-[#F8F9FA] border border-[#DADCE0] p-3 rounded-2xl space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#5F6368]">Media Transport</span>
              <span className="font-mono text-[#1E8E3E] font-bold">WebRTC DTLS-SRTP (Encrypted)</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-[#5F6368]">Quality</span>
              <span className="font-semibold text-[#202124]">HD 1080p Adaptive</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <Button
            size="sm"
            onClick={onClose}
            className="bg-[#1A73E8] hover:bg-[#185ABC] text-white text-xs font-bold px-6 h-9 rounded-full cursor-pointer shadow-xs"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
