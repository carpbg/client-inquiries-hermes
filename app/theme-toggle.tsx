"use client";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
export function ThemeToggle(){const{theme,setTheme}=useTheme();return <Button type="button" variant="outline" size="icon" onClick={()=>setTheme(theme==="dark"?"light":"dark")} aria-label="Смяна на цветовата схема">{theme==="dark"?<Sun/>:<Moon/>}</Button>}
