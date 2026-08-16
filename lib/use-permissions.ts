"use client";
import { useCallback, useMemo } from "react";
import type { BaseRole } from "@/lib/permissions";
export function usePermissions(role: BaseRole, permissions: readonly string[]) { const set=useMemo(()=>new Set(permissions),[permissions]); const can=useCallback((permission:string)=>role==="admin"||set.has(permission),[role,set]); return {role,permissions:set,can}; }
