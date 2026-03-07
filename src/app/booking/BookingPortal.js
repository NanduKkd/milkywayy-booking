"use client";

import { useState, useMemo, use } from "react";
import {
  Building2,
  Home,
  Store,
  Camera,
  Video,
  Globe,
  Sun,
  Moon,
  Clock,
  Sparkles,
  MapPin,
  Building,
  Hash,
  ChevronDown,
  ChevronUp,
  Copy,
  Plus,
  Trash2,
  Info,
  Lock,
  CreditCard,
  Smartphone,
  Wallet,
  CheckCircle,
  ArrowLeft,
  Receipt,
  FileText,
  Home as HomeIcon,
  Loader2,
  CalendarDays,
  ClipboardList,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/contexts/auth";

// Types
const BookingDataDefaults = {
  propertyType: "",
  size: "",
  date: undefined,
  time: "",
  timeSlot: "",
  services: [],
  videoType: "short",
  lightingOption: "",
  building: "",
  location: "",
  roomNumber: "",
  paymentMethod: "",
  couponCode: "",
  commercialTier: "",
  commercialServices: [],
  commercialPrice: 0,
};

// Static Data
const propertyTypes = [
  {
    value: "apartment",
    label: "Apartment",
    mobileLabel: "Apartment",
    description: "Apartments & studios",
    icon: Building2,
  },
  {
    value: "villa-townhouse",
    label: "Villa / Townhouse",
    mobileLabel: "Villa/TH",
    description: "Villas, townhouses & penthouses",
    icon: Home,
  },
  {
    value: "commercial",
    label: "Commercial",
    mobileLabel: "Commercial",
    description: "Offices, retail & commercial spaces",
    icon: Store,
  },
];

const propertySizeOptions = {
  apartment: ["Studio", "1BR", "2BR", "3BR", "4BR+"],
  "villa-townhouse": ["Studio Villa", "1BR Villa", "2BR Villa", "3BR Villa", "4BR+ Villa"],
  commercial: ["Small (<1000sqft)", "Medium (1000-3000sqft)", "Large (3000-5000sqft)", "Extra Large (>5000sqft)"],
};

const timeSlots = [
  { value: "morning", label: "Morning", time: "09:00 - 12:00", description: "Arrival: 9:30 AM" },
  { value: "afternoon", label: "Afternoon", time: "12:00 - 15:00", description: "Arrival: 12:30 PM" },
  { value: "evening", label: "Evening", time: "15:00 - 18:00", description: "Arrival: 3:30 PM" },
];

const services = [
  { value: "photography", label: "Photography", icon: Camera, description: "Professional photos" },
  { value: "videography", label: "Videography", icon: Video, description: "Video walkthrough" },
  { value: "360tour", label: "360° Tour", icon: Globe, description: "Interactive virtual tour" },
];

const pricingData = {
  apartment: {
    Studio: { photography: 350, videography: 450, "360tour": 550 },
    "1BR": { photography: 400, videography: 500, "360tour": 600 },
    "2BR": { photography: 450, videography: 550, "360tour": 650 },
    "3BR": { photography: 500, videography: 600, "360tour": 700 },
    "4BR+": { photography: 550, videography: 650, "360tour": 750 },
  },
  "villa-townhouse": {
    "Studio Villa": { photography: 450, videography: 550, "360tour": 650 },
    "1BR Villa": { photography: 500, videography: 600, "360tour": 700 },
    "2BR Villa": { photography: 550, videography: 650, "360tour": 750 },
    "3BR Villa": { photography: 600, videography: 700, "360tour": 800 },
    "4BR+ Villa": { photography: 650, videography: 750, "360tour": 850 },
  },
};

const commercialTiers = [
  { value: "basic", label: "Basic", price: 1200, description: "Essential commercial package" },
  { value: "professional", label: "Professional", price: 2500, description: "Professional commercial package" },
  { value: "premium", label: "Premium", price: 4500, description: "Premium commercial package" },
];

const commercialServices = [
  { value: "photography", label: "Photography", icon: Camera },
  { value: "short-form", label: "Short-form Video", icon: Video },
  { value: "long-form", label: "Long-form Video", icon: Video },
  { value: "360tour", label: "360° Tour", icon: Globe },
];

const paymentMethods = [
  { value: "card", label: "Credit/Debit Card", icon: CreditCard },
  { value: "wallet", label: "Digital Wallet", icon: Smartphone },
  { value: "bank", label: "Bank Transfer", icon: Wallet },
];

// Helper Functions
function calcPropertyTotal(data) {
  if (data.propertyType === "commercial") {
    return data.commercialPrice || 0;
  }
  if (!data.propertyType || !data.size) return 0;
  const pricing = pricingData[data.propertyType]?.[data.size];
  if (!pricing) return 0;
  let total = 0;
  if (data.services.includes("photography")) total += pricing.photography;
  if (data.services.includes("videography")) total += pricing.videography;
  if (data.services.includes("360tour")) total += pricing["360tour"];
  return total;
}

function buildServicesList(p) {
  const names = [];
  if (p.services.includes("photography")) names.push("Photography");
  if (p.services.includes("videography")) names.push("Videography");
  if (p.services.includes("360tour")) names.push("360° Tour");
  if (p.commercialServices.length > 0) {
    p.commercialServices.forEach((s) => {
      if (s === "photography") names.push("Photography");
      if (s === "short-form") names.push("Short-form Video");
      if (s === "long-form") names.push("Long-form Video");
      if (s === "360tour") names.push("360° Tour");
    });
  }
  return names.join(" + ");
}

function buildLocationLine(p) {
  const parts = [p.roomNumber, p.building, p.location].filter(Boolean);
  return parts.join(", ");
}

function buildSummaryLabel(p) {
  const pt = propertyTypes.find((t) => t.value === p.propertyType);
  const typeName = pt?.label || "";
  const sizeName = p.size || "";
  return sizeName ? `${sizeName} ${typeName}` : typeName;
}

const OrderSummary = ({ properties, onContinue, canContinue, loading }) => {
  const totals = properties.map(calcPropertyTotal);
  const grandTotal = totals.reduce((a, b) => a + b, 0);

  return (
    <div className="premium-card rounded-2xl p-6 md:p-8">
      <h3 className="text-xl font-semibold text-foreground mb-4">Booking Summary</h3>

      {!canContinue ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Select services to see your summary</p>
      ) : (
        <div className="space-y-3 mb-6">
          {properties.map((p, i) => {
            const t = totals[i];
            if (t === 0) return null;
            const label = buildSummaryLabel(p);
            const servicesText = buildServicesList(p);
            const location = buildLocationLine(p);

            return (
              <div key={i} className="p-3 rounded-xl bg-secondary/30 border border-border/40 space-y-1.5">
                <div className="flex justify-between items-start gap-2">
                  <p className="text-sm font-semibold text-foreground">{label || `Property ${i + 1}`}</p>
                  <p className="text-sm font-semibold text-foreground">AED {t.toLocaleString()}</p>
                </div>
                {location && <p className="text-xs text-muted-foreground">{location}</p>}
                {servicesText && <p className="text-xs text-muted-foreground">{servicesText}</p>}
              </div>
            );
          })}
        </div>
      )}

      <div className="border-t border-border/50 pt-4 mb-5">
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">Total Amount</p>
          <p className="text-2xl md:text-3xl font-bold text-foreground">AED {grandTotal.toLocaleString()}</p>
        </div>
      </div>

      <Button
        onClick={onContinue}
        disabled={!canContinue || loading}
        className="w-full btn-primary-premium text-lg py-4"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          "Proceed to Checkout"
        )}
      </Button>
    </div>
  );
};

// Main Component
export default function BookingPortal({ pricingsPromise, discountsPromise }) {
  const router = useRouter();
  const { authState, login } = useAuth();
  
  const [properties, setProperties] = useState([BookingDataDefaults]);
  const [expandedIndex, setExpandedIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const totalAmount = useMemo(() => {
    return properties.reduce((sum, p) => sum + calcPropertyTotal(p), 0);
  }, [properties]);

  const addProperty = () => {
    setProperties([...properties, { ...BookingDataDefaults }]);
    setExpandedIndex(properties.length);
  };

  const updateProperty = (index, data) => {
    const updated = [...properties];
    updated[index] = { ...updated[index], ...data };
    setProperties(updated);
  };

  const removeProperty = (index) => {
    if (properties.length > 1) {
      setProperties(properties.filter((_, i) => i !== index));
      if (expandedIndex >= properties.length - 1) {
        setExpandedIndex(Math.max(0, expandedIndex - 1));
      }
    }
  };

  const duplicateProperty = (index) => {
    const propertyToDuplicate = properties[index];
    setProperties([...properties, { ...propertyToDuplicate }]);
  };

  const handleSubmit = async () => {
    if (!authState.isAuthenticated) {
      login();
      return;
    }

    setIsProcessing(true);
    try {
      // Here you would integrate with your existing booking logic
      toast.success("Booking submitted successfully!");
      router.push("/booking/success");
    } catch (error) {
      toast.error("Failed to submit booking. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container mx-auto px-6 py-8 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-8 fade-in">
        <h1 className="text-4xl font-bold text-foreground mb-4">Book Your Property Shoot</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Schedule professional photography, videography, and 360° tours for your property in just a few clicks.
        </p>
      </div>

      {/* Property Cards */}
      <div className="space-y-4 mb-8">
        {properties.map((property, index) => (
          <PropertyCard
            key={index}
            index={index}
            data={property}
            isExpanded={expandedIndex === index}
            onToggle={() => setExpandedIndex(expandedIndex === index ? -1 : index)}
            onChange={(data) => updateProperty(index, data)}
            onDuplicate={() => duplicateProperty(index)}
            onRemove={() => removeProperty(index)}
            canRemove={properties.length > 1}
          />
        ))}
      </div>

      {/* Add Property Button */}
      <div className="flex justify-center mb-8">
        <Button
          onClick={addProperty}
          variant="outline"
          className="border-border bg-secondary/40 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Property
        </Button>
      </div>

            {/* Summary & Checkout */}
      <OrderSummary
        properties={properties}
        onContinue={handleSubmit}
        canContinue={totalAmount > 0}
        loading={isProcessing}
      />
    </div>
  );
}

// Property Card Component
const PropertyCard = ({
  index,
  data,
  isExpanded,
  onToggle,
  onChange,
  onDuplicate,
  onRemove,
  canRemove,
}) => {
  const sizeOptions =
    data.propertyType && data.propertyType !== "commercial" ? propertySizeOptions[data.propertyType] : [];
  const isCommercial = data.propertyType === "commercial";
  const pricing = !isCommercial && data.propertyType && data.size ? pricingData[data.propertyType]?.[data.size] : null;
  const total = calcPropertyTotal(data);

  const toggleService = (service) => {
    const current = data.services || [];
    const next = current.includes(service) ? current.filter((s) => s !== service) : [...current, service];
    if (service === "videography" && current.includes("videography")) {
      onChange({ services: next, videoType: "short", lightingOption: "" });
    } else {
      onChange({ services: next });
    }
  };

  const handlePropertyTypeChange = (type) => {
    onChange({
      propertyType: type,
      size: "",
      services: [],
      videoType: "short",
      lightingOption: "",
      commercialTier: "",
      commercialServices: [],
      commercialPrice: 0,
    });
  };

  const summaryParts = [];
  if (data.propertyType) {
    const pt = propertyTypes.find((t) => t.value === data.propertyType);
    summaryParts.push(pt?.label || data.propertyType);
  }
  if (data.size) summaryParts.push(data.size);
  if (data.location) summaryParts.push(data.location);

  return (
    <div className="premium-card rounded-2xl overflow-hidden card-hover-lift">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 md:p-6 text-left hover:bg-muted/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center text-xs font-semibold text-muted-foreground">
            {index + 1}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Property {index + 1}</p>
            {!isExpanded && summaryParts.length > 0 && (
              <p className="text-xs text-muted-foreground mt-0.5">{summaryParts.join(" · ")}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {total > 0 && (
            <p className="text-lg font-bold text-foreground">AED {total}</p>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border p-5 md:p-6 space-y-6">
          {/* Property Type */}
          <div>
            <label className="text-sm font-medium text-foreground mb-3 block">Property Type</label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {propertyTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => handlePropertyTypeChange(type.value)}
                    className={`p-4 rounded-xl border text-center transition-all duration-200 hover:scale-[1.02] ${
                      data.propertyType === type.value
                        ? "border-foreground/20 bg-secondary/80 text-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <Icon className="w-6 h-6 mx-auto mb-2" />
                    <p className="text-sm font-medium">{type.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Size or Commercial Tier */}
          {!isCommercial && data.propertyType && (
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Property Size</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                {sizeOptions.map((size) => (
                  <button
                    key={size}
                    onClick={() => onChange({ size })}
                    className={`p-3 rounded-lg border text-sm transition-all duration-200 ${
                      data.size === size
                        ? "border-foreground/20 bg-secondary/80 text-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {isCommercial && (
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Commercial Package</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {commercialTiers.map((tier) => (
                  <button
                    key={tier.value}
                    onClick={() => onChange({ commercialTier: tier.value, commercialPrice: tier.price })}
                    className={`p-4 rounded-xl border text-center transition-all duration-200 hover:scale-[1.02] ${
                      data.commercialTier === tier.value
                        ? "border-foreground/20 bg-secondary/80 text-foreground"
                        : "border-border text-muted-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <p className="text-lg font-bold text-foreground">AED {tier.price}</p>
                    <p className="text-sm font-medium mt-1">{tier.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Services */}
          {!isCommercial && (
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Services</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {services.map((service) => {
                  const Icon = service.icon;
                  const isSelected = data.services.includes(service.value);
                  const price = pricing?.[service.value] || 0;
                  return (
                    <button
                      key={service.value}
                      onClick={() => toggleService(service.value)}
                      className={`p-4 rounded-xl border text-center transition-all duration-200 hover:scale-[1.02] ${
                        isSelected
                          ? "border-foreground/20 bg-secondary/80 text-foreground"
                          : "border-border text-muted-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-2" />
                      <p className="text-sm font-medium">{service.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                      {price > 0 && (
                        <p className="text-sm font-bold text-foreground mt-2">AED {price}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Commercial Services */}
          {isCommercial && (
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Services</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {commercialServices.map((service) => {
                  const Icon = service.icon;
                  const isSelected = data.commercialServices.includes(service.value);
                  return (
                    <button
                      key={service.value}
                      onClick={() => {
                        const current = data.commercialServices || [];
                        const next = isSelected
                          ? current.filter((s) => s !== service.value)
                          : [...current, service.value];
                        onChange({ commercialServices: next });
                      }}
                      className={`p-3 rounded-lg border text-center transition-all duration-200 ${
                        isSelected
                          ? "border-foreground/20 bg-secondary/80 text-foreground"
                          : "border-border text-muted-foreground hover:bg-secondary/50"
                      }`}
                    >
                      <Icon className="w-5 h-5 mx-auto mb-1" />
                      <p className="text-xs font-medium">{service.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Location Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Building</label>
              <Input
                value={data.building}
                onChange={(e) => onChange({ building: e.target.value })}
                placeholder="Building name"
                className="border-border bg-secondary/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Location</label>
              <Input
                value={data.location}
                onChange={(e) => onChange({ location: e.target.value })}
                placeholder="Area/Community"
                className="border-border bg-secondary/20"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">Unit/Room</label>
              <Input
                value={data.roomNumber}
                onChange={(e) => onChange({ roomNumber: e.target.value })}
                placeholder="Unit number"
                className="border-border bg-secondary/20"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t border-border">
            <div className="flex gap-2">
              <Button
                onClick={onDuplicate}
                variant="outline"
                size="sm"
                className="border-border text-muted-foreground hover:bg-secondary/50"
              >
                <Copy className="w-4 h-4 mr-1" />
                Duplicate
              </Button>
              {canRemove && (
                <Button
                  onClick={onRemove}
                  variant="outline"
                  size="sm"
                  className="border-border text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Remove
                </Button>
              )}
            </div>
            {total > 0 && (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Property Total</p>
                <p className="text-xl font-bold text-foreground">AED {total}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

