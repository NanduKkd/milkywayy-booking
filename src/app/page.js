"use client";
import dynamic from "next/dynamic";
import { useState } from "react";
import Footer from "@/components/Footer";
import AnnouncementBar from "@/components/landing/AnnouncementBar";
import ContactSection from "@/components/landing/ContactSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import HeroSection from "@/components/landing/HeroSection";
import OurWorkPreview from "@/components/landing/OurWorkPreview";
import PainSolutionSection from "@/components/landing/PainSolutionSection";
import PortalUSPSection from "@/components/landing/PortalUSPSection";
import ReviewsSection from "@/components/landing/ReviewsSection";
import SeeItInActionSection from "@/components/landing/SeeItInActionSection";
import NewNavbar from "@/components/NewNavbar";
import { poppins } from "@/fonts";

const VideoModal = dynamic(() => import("@/components/VideoModal"), {
  ssr: false,
});

export default function Page() {
  const [showVideoModal, setShowVideoModal] = useState(false);

  return (
    <div
      className={`relative ${poppins.className} min-h-screen bg-background text-foreground`}
    >
      <div className="fixed top-0 left-0 right-0 z-50">
        <AnnouncementBar />
        <NewNavbar />
      </div>

      <main className="pt-[100px]">
        <HeroSection onWatchVideo={() => setShowVideoModal(true)} />
        <PainSolutionSection />
        <SeeItInActionSection />
        <PortalUSPSection />
        <OurWorkPreview />
        <ReviewsSection />
        <FAQSection />
        <FinalCTASection />
        <ContactSection />
      </main>
      <Footer />
      {showVideoModal
        ? <VideoModal open={showVideoModal} onOpenChange={setShowVideoModal} />
        : null}
    </div>
  );
}
/*
'use client';
import Preloader from "@/components/Preloader";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import AboutSection from "@/components/home/AboutSection";
import ServicesSection from "@/components/home/ServicesSection";
import ProjectsSection from "@/components/home/ProjectsSection";
import PortalUSPSection from "@/components/home/PortalUSPSection";
import CTASection from "@/components/home/CTASection";
import ContactSection from "@/components/home/ContactSection";

const Index = () => {
  return (
    <>
      <Preloader />
      <div className="relative">
        <Navbar />
        <main>
          <HeroSection />
          <AboutSection />
          <ServicesSection />
          <ProjectsSection />
          <PortalUSPSection />
          <CTASection />
          <ContactSection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
*/
