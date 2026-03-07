// "use client";

// import * as React from "react";
// import { ChevronLeft, ChevronRight } from "lucide-react";
// import { Button } from "./button";
// import { cn } from "@/lib/utils";

// function Calendar({
//   className,
//   classNames,
//   showOutsideDays = true,
//   ...props
// }) {
//   return (
//     <div
//       className={cn("p-3", className)}
//       {...props}
//     >
//       <div className="space-y-4">
//         <div className="flex items-center justify-between">
//           <Button
//             variant="outline"
//             className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
//           >
//             <ChevronLeft className="h-4 w-4" />
//           </Button>
//           <div className="text-sm font-medium">December 2024</div>
//           <Button
//             variant="outline"
//             className="h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
//           >
//             <ChevronRight className="h-4 w-4" />
//           </Button>
//         </div>
//         <div className="grid grid-cols-7 gap-1 text-center text-xs">
//           {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
//             <div
//               key={day}
//               className="text-muted-foreground font-medium"
//             >
//               {day}
//             </div>
//           ))}
//         </div>
//         <div className="grid grid-cols-7 gap-1">
//           {Array.from({ length: 35 }, (_, i) => {
//             const date = i - 2;
//             const isCurrentMonth = date >= 1 && date <= 31;
//             const isToday = date === 15;
//             const isSelected = date === 15;
            
//             return (
//               <Button
//                 key={i}
//                 variant={isSelected ? "default" : "ghost"}
//                 className={cn(
//                   "h-8 w-8 p-0 font-normal",
//                   !isCurrentMonth && "text-muted-foreground opacity-50",
//                   isToday && !isSelected && "bg-accent text-accent-foreground",
//                   isSelected && "bg-primary text-primary-foreground"
//                 )}
//               >
//                 {isCurrentMonth ? date : ""}
//               </Button>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }

// Calendar.displayName = "Calendar";

// export { Calendar };
