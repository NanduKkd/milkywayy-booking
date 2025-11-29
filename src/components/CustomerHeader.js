"use client";

import { Navbar, NavbarBrand, NavbarContent, NavbarItem } from "@heroui/react";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";

export default function CustomerHeader() {
    return (
        <Navbar
            maxWidth="xl"
            className="bg-black/90 backdrop-blur-md border-b border-white/10"
            isBordered={false}
        >
            <NavbarBrand>
                <Link href="/" className="font-bold text-white text-xl">
                    MilkyWayy
                </Link>
            </NavbarBrand>
            <NavbarContent className="hidden sm:flex gap-8" justify="center">
                <NavbarItem>
                    <Link className="text-gray-300 hover:text-white transition-colors" href="/booking">
                        Book Now
                    </Link>
                </NavbarItem>
                <NavbarItem>
                    <Link className="text-gray-300 hover:text-white transition-colors" href="/dashboard/bookings">
                        Dashboard
                    </Link>
                </NavbarItem>
            </NavbarContent>
            <NavbarContent justify="end">
                <NavbarItem>
                    <UserMenu />
                </NavbarItem>
            </NavbarContent>
        </Navbar>
    );
}
