"use client";

import React from "react";
import { CodingManagementHub } from "@/components/admin/coding-management-hub";

export default function TrainerCodingPage() {
  return (
    <div className="w-full p-4 sm:p-6 lg:p-8">
      <CodingManagementHub role="trainer" />
    </div>
  );
}
