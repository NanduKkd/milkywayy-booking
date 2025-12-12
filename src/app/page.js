'use client';
import { useState } from 'react';
import AnnouncementBar from '@/components/landing/AnnouncementBar';
import NewNavbar from '@/components/NewNavbar';
import HeroSection from '@/components/landing/HeroSection';
import SocialProofStrip from '@/components/landing/SocialProofStrip';
import PainSolutionSection from '@/components/landing/PainSolutionSection';
import SeeItInActionSection from '@/components/landing/SeeItInActionSection';
import PortalUSPSection from '@/components/landing/PortalUSPSection';
import ServicesSection from '@/components/landing/ServicesSection';
import OurWorkPreview from '@/components/landing/OurWorkPreview';
import ReviewsSection from '@/components/landing/ReviewsSection';
import FAQSection from '@/components/landing/FAQSection';
import FinalCTASection from '@/components/landing/FinalCTASection';
import ContactSection from '@/components/landing/ContactSection';
import VideoModal from '@/components/VideoModal';
import Footer from '@/components/Footer';
import StarBackground from '@/components/StarBackground';

export default function Page() {
  const [showVideoModal, setShowVideoModal] = useState(false);

  return (
    <div className="relative min-h-screen text-white bg-background">
      <StarBackground />
      <div className="relative z-10">
        <div className="fixed top-0 left-0 right-0 z-50">
          <AnnouncementBar />
          <NewNavbar />
        </div>
        <main className="pt-[100px]">
          <HeroSection onWatchVideo={() => setShowVideoModal(true)} />
      {/* <SocialProofStrip /> */}
          <PainSolutionSection />
          <SeeItInActionSection onWatchVideo={() => setShowVideoModal(true)} />
          <PortalUSPSection />
          <ServicesSection />
          <OurWorkPreview />
          <ReviewsSection />
          <FAQSection />
          <FinalCTASection />
          <ContactSection />
        </main>
        <Footer />
      </div>
      <VideoModal open={showVideoModal} onOpenChange={setShowVideoModal} />
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
