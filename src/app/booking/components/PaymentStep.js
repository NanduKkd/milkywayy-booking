import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function PaymentStep({
  properties,
  onBack,
  getPropertyPrice,
  calculateTotal,
  appliedAutoDiscounts,
  discountAmount,
  amountAfterAuto,
  autoWalletCredits,
  couponCode,
  setCouponCode,
  handleApplyCoupon,
  couponError,
  couponSuccess,
  handleFinalSubmit,
  isProcessingPayment,
}) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
      <Button variant="ghost" onClick={onBack} className="mb-4 pl-0">
        <ArrowLeft size={20} className="mr-2" />
        Back to Details
      </Button>

      <h2 className={`text-2xl font-bold text-foreground mb-6 font-heading`}>
        Payment Verification
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          {properties.map((property, index) => (
            <Card
              // biome-ignore lint/suspicious/noArrayIndexKey: Checkout properties retain their form-array position for this read-only summary.
              key={index}
              className="bg-card/50 border-border"
            >
              <CardHeader className="flex flex-row justify-between items-start pb-2 space-y-0">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {property.community || "Unknown Location"} -{" "}
                    {property.propertyType || "Unknown Type"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {property.building}{" "}
                    {property.unitNumber && `- ${property.unitNumber}`}
                  </p>
                </div>
                <div className="text-right">
                  <div className="bg-secondary px-3 py-1 rounded-md text-sm font-medium text-secondary-foreground">
                    AED {getPropertyPrice(property)}
                  </div>
                </div>
              </CardHeader>
              <Separator className="bg-border my-2" />
              <CardContent className="space-y-3 text-sm text-foreground/90">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Size</span>
                  <span>{property.propertySize}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Time</span>
                  <span>
                    {property.preferredDate} |{" "}
                    {property.startTime || property.timeSlot}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Services</span>
                  <div className="flex gap-2 flex-wrap justify-end">
                    {property.services?.map((s) => (
                      <span
                        key={s}
                        className="bg-secondary px-2 py-0.5 rounded text-xs text-secondary-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card className="bg-card/50 border-border">
            <CardContent className="space-y-4 pt-6">
              <h3 className="text-lg font-semibold text-foreground">
                Order Summary
              </h3>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="whitespace-nowrap">
                    AED {calculateTotal().toLocaleString()}
                  </span>
                </div>

                {appliedAutoDiscounts
                  .filter((d) => d.type !== "wallet")
                  .map((d) => (
                    <div
                      key={`${d.type}-${d.name}-${d.value}`}
                      className="flex justify-between items-center text-sm"
                    >
                      <span className="text-green-500">
                        {d.name} (Discount)
                      </span>
                      <span
                        className={cn("whitespace-nowrap", "text-green-500")}
                      >
                        - AED {d.value.toLocaleString()}
                      </span>
                    </div>
                  ))}

                {discountAmount > 0 && (
                  <div className="flex justify-between items-center text-muted-foreground">
                    <span>Coupon Discount</span>
                    <span className="text-green-500 whitespace-nowrap">
                      - AED {discountAmount.toLocaleString()}
                    </span>
                  </div>
                )}

                <Separator className="bg-border my-2" />
                <div className="flex justify-between items-center text-xl font-bold text-foreground">
                  <span>Total Payable</span>
                  <span className="whitespace-nowrap">
                    AED {(amountAfterAuto - discountAmount).toLocaleString()}
                  </span>
                </div>
                {autoWalletCredits > 0 && (
                  <div className="text-xs text-muted-foreground text-right mt-1">
                    You will earn AED {autoWalletCredits.toLocaleString()} in
                    wallet credits
                  </div>
                )}
              </div>

              <div className="pt-4">
                <div className="space-y-1">
                  <div className="relative">
                    <Input
                      placeholder="Coupon Code"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="bg-secondary/50 border-border hover:border-accent focus-visible:ring-ring text-foreground pr-20"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                      <Button
                        size="sm"
                        className="font-semibold h-8"
                        onClick={handleApplyCoupon}
                        type="button"
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                  {couponError && (
                    <p className="text-destructive text-xs">{couponError}</p>
                  )}
                  {couponSuccess && (
                    <p className="text-green-500 text-xs">{couponSuccess}</p>
                  )}
                </div>
              </div>

              <Button
                size="lg"
                className="w-full font-semibold"
                onClick={handleFinalSubmit}
                disabled={isProcessingPayment}
              >
                {isProcessingPayment
                  ? <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  : "Make Payment"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
