"use client";

import React from "react";
import { CodingManagementHub } from "@/components/admin/coding-management-hub";

export default function AdminCodingPage() {
  return (
    <div className="w-full py-2 space-y-6">
      <CodingManagementHub role="admin" />
    </div>
  );
}
