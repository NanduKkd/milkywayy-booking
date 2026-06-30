import { useState } from "react";
import {
  PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area,
} from "recharts";
import {
  LayoutDashboard, Calendar as CalendarIcon, CalendarDays, Users, FileText,
  Percent, Tag, Clock, DollarSign, Image as ImageIcon, Star, TrendingUp, LogOut,
  Plus, Pencil, Trash2, EyeOff, Download, ChevronLeft, ChevronRight,
  ChevronDown, X, CheckCircle, XCircle, AlertCircle, Camera, Video, Globe,
  BarChart2, FileSpreadsheet, FileDown, ArrowUpRight, Receipt, Wallet, Search, Settings,
} from "lucide-react";

const BOOKINGS = [
  { id:735, property:"123, Marina, Dubai",           type:"Apartment",      size:"1 Bed",  date:"2026-06-15", slot:"Morning",   services:"Photography, Videography",  amount:800,  status:"Project Completed", user:"Akash",             email:"akashpraseed13@gmail.com" },
  { id:718, property:"Palm Jumeirah Villa",           type:"Villa/Townhouse",size:"4 Bed",  date:"2026-06-10", slot:"Afternoon", services:"Long Form - Daylight",       amount:1300, status:"Awaiting Payment",  user:"Ahmed Al Mansoori", email:"ahmed@example.com"        },
  { id:709, property:"1205, Marina Heights",         type:"Apartment",      size:"2 Bed",  date:"2026-04-29", slot:"Morning",   services:"Photography",               amount:800,  status:"Project Completed", user:"Akash",             email:"akashpraseed13@gmail.com" },
  { id:705, property:"1001, Short time, Test 1",     type:"Apartment",      size:"Studio", date:"2026-04-21", slot:"Morning",   services:"Photography",               amount:500,  status:"Cancelled",         user:"Akash",             email:"akashpraseed13@gmail.com" },
  { id:698, property:"Downtown Burj View",           type:"Apartment",      size:"3 Bed",  date:"2026-05-12", slot:"Afternoon", services:"360 Virtual Tour",          amount:950,  status:"Project Completed", user:"Priya Sharma",      email:"priya@example.com"        },
  { id:692, property:"JVC Green Park",               type:"Apartment",      size:"1 Bed",  date:"2026-05-05", slot:"Morning",   services:"Short Form Video",          amount:300,  status:"Cancelled",         user:"Omar Hassan",       email:"omar@example.com"         },
  { id:687, property:"Arabian Ranches Villa",        type:"Villa/Townhouse",size:"3 Bed",  date:"2026-05-20", slot:"Daylight",  services:"Long Form - Daylight",       amount:1100, status:"Project Completed", user:"Rajesh Kumar",      email:"rajesh@example.com"       },
  { id:681, property:"Bluewaters Penthouse",         type:"Apartment",      size:"4 Bed",  date:"2026-06-08", slot:"Day+Night", services:"Long Form - Day + Night",    amount:1600, status:"Shoot Booked",      user:"Sarah Mitchell",    email:"sarah@example.com"        },
  { id:672, property:"Meydan One, Tower B",          type:"Apartment",      size:"2 Bed",  date:"2026-03-08", slot:"Morning",   services:"Photography",               amount:600,  status:"Project Completed", user:"Priya Sharma",      email:"priya@example.com"        },
  { id:665, property:"Sobha Hartland Villa",         type:"Villa/Townhouse",size:"4 Bed",  date:"2026-03-15", slot:"Daylight",  services:"Long Form - Daylight",       amount:950,  status:"Project Completed", user:"Rajesh Kumar",      email:"rajesh@example.com"       },
  { id:658, property:"Dubai Hills, Maple 2",         type:"Villa/Townhouse",size:"3 Bed",  date:"2026-03-22", slot:"Day+Night", services:"Long Form - Day + Night",    amount:1300, status:"Project Completed", user:"Ahmed Al Mansoori", email:"ahmed@example.com"        },
  { id:651, property:"Palm Beach Tower 1",           type:"Apartment",      size:"1 Bed",  date:"2026-02-10", slot:"Morning",   services:"Photography, 360 Tour",      amount:850,  status:"Project Completed", user:"Akash",             email:"akashpraseed13@gmail.com" },
  { id:644, property:"Creek Harbour Residences",     type:"Apartment",      size:"2 Bed",  date:"2026-02-20", slot:"Afternoon", services:"Short Form Video",           amount:350,  status:"Project Completed", user:"Omar Hassan",       email:"omar@example.com"         },
  { id:637, property:"JVC Studio, Bloom Towers",     type:"Apartment",      size:"Studio", date:"2026-01-15", slot:"Morning",   services:"Photography",               amount:500,  status:"Project Completed", user:"Priya Sharma",      email:"priya@example.com"        },
];

const USERS = [
  { id:31, name:"Super Admin",        phone:"+1234567890",   email:"admin@milkywayy.com",         role:"SUPERADMIN", count:0, spent:0    },
  { id:30, name:"Akash",              phone:"+971507263306", email:"akashpraseed13@gmail.com",     role:"CUSTOMER",   count:5, spent:2950 },
  { id:29, name:"Ahmed Al Mansoori", phone:"+97150123456",  email:"ahmed@example.com",            role:"CUSTOMER",   count:2, spent:2600 },
  { id:28, name:"Priya Sharma",       phone:"+97155987654",  email:"priya@example.com",            role:"CUSTOMER",   count:3, spent:1550 },
  { id:27, name:"Omar Hassan",        phone:"+97158112233",  email:"omar@example.com",             role:"CUSTOMER",   count:2, spent:650  },
  { id:26, name:"Rajesh Kumar",       phone:"+97154445566",  email:"rajesh@example.com",           role:"CUSTOMER",   count:2, spent:2050 },
  { id:25, name:"Sarah Mitchell",     phone:"+97152778899",  email:"sarah@example.com",            role:"CUSTOMER",   count:1, spent:1600 },
];

const INVOICES = [
  { id:"MW-2026-0605-001", ref:"MWB-1735", user:"Akash",        email:"akashpraseed13@gmail.com", date:"Jun 6, 2026",  amount:800  },
  { id:"MW-2026-0520-001", ref:"MWB-1698", user:"Priya Sharma", email:"priya@example.com",        date:"May 12, 2026", amount:950  },
  { id:"MW-2026-0520-002", ref:"MWB-1687", user:"Rajesh Kumar", email:"rajesh@example.com",       date:"May 20, 2026", amount:1100 },
  { id:"MW-2026-0425-001", ref:"MWB-1709", user:"Akash",        email:"akashpraseed13@gmail.com", date:"Apr 29, 2026", amount:800  },
  { id:"MW-2026-0411-001", ref:"MWB-1705", user:"Akash",        email:"akashpraseed13@gmail.com", date:"Apr 11, 2026", amount:250  },
];

const PORTFOLIO = [
  {id:1,title:"Bluewaters Island",                  sub:"$26,000,000 Duplex Penthouse",   type:"VIDEO"      },
  {id:2,title:"1 Bed AirBnb",                       sub:"JVC",                             type:"SHORT_VIDEO" },
  {id:3,title:"3 Bed Villa",                        sub:"Arabian Ranches",                 type:"SHORT_VIDEO" },
  {id:4,title:"Worlds Islands",                     sub:"$19,500,000 Ocean Mansion",       type:"VIDEO"      },
  {id:5,title:"RR Residence",                       sub:"Dubai South",                     type:"IMAGE"      },
  {id:6,title:"1 Bed Airbnb",                       sub:"Vida Dubai Marina & Yacht Club",  type:"360_VIEW"   },
  {id:7,title:"Eaton Place - Ellington Properties", sub:"JVC, Dubai",                      type:"IMAGE"      },
  {id:8,title:"1 Bed with Marina Canal View",       sub:"Liv, Dubai Marina",               type:"360_VIEW"   },
];

const REVIEWS = [
  {id:1,name:"Esteban Romero",      title:"CEO at Inhouse Realty",                 text:"Outstanding quality and professionalism. The photos transformed our listings."},
  {id:2,name:"Mudit Malhotra",      title:"Senior Manager at K Estates Dubai",     text:"Exceptional service. Virtual tours significantly increased our inquiries."   },
  {id:3,name:"Yogendra Parmar",     title:"Senior Consultant at Xperience Realty", text:"Highly recommend Milkywayy for any property media needs. Professional."     },
  {id:4,name:"Nupur Jha",           title:"Sales Manager at Binghatti",             text:"Photography and videography work was beyond expectations. Great team!"       },
  {id:5,name:"Sreejith Meleveettil",title:"Dubai, UAE",                             text:"Best property media agency in Dubai. Will definitely use again."            },
  {id:6,name:"Leon Thiel",          title:"Dubai, UAE",                             text:"Amazing work, super fast delivery. Very happy with the results."            },
  {id:7,name:"Britt",               title:"Dubai, UAE",                             text:"Incredible shots that really showcase the property beautifully."            },
  {id:8,name:"Nahas Muhammed",      title:"Dubai, UAE",                             text:"Professional, creative, and delivered on time. Highly recommend."           },
];

const MONTHLY_TREND = [
  {month:"Jan",revenue:3200,completed:4,cancelled:1},
  {month:"Feb",revenue:4100,completed:5,cancelled:0},
  {month:"Mar",revenue:5800,completed:7,cancelled:2},
  {month:"Apr",revenue:2350,completed:2,cancelled:1},
  {month:"May",revenue:3350,completed:3,cancelled:1},
  {month:"Jun",revenue:2600,completed:2,cancelled:0},
];

const FIN_DATA = {
  "Jun 2026":{revenue:2600,completed:2,cancelled:0,pending:2,lostAmount:0,avgValue:1300,
    weekly:[{w:"W1",r:0},{w:"W2",r:1600},{w:"W3",r:800},{w:"W4",r:200}],
    status:[{name:"Completed",value:2,color:"#10b981"},{name:"Pending",value:2,color:"#f59e0b"},{name:"Cancelled",value:0,color:"#ef4444"}],
    services:[{name:"Photography",value:800},{name:"Videography",value:1300},{name:"360 Tour",value:500}]},
  "May 2026":{revenue:3350,completed:3,cancelled:1,pending:0,lostAmount:300,avgValue:950,
    weekly:[{w:"W1",r:300},{w:"W2",r:950},{w:"W3",r:1100},{w:"W4",r:1000}],
    status:[{name:"Completed",value:3,color:"#10b981"},{name:"Pending",value:0,color:"#f59e0b"},{name:"Cancelled",value:1,color:"#ef4444"}],
    services:[{name:"Photography",value:950},{name:"Long Form",value:1100},{name:"Short Form",value:300},{name:"360 Tour",value:1000}]},
  "Apr 2026":{revenue:2350,completed:2,cancelled:1,pending:0,lostAmount:500,avgValue:783,
    weekly:[{w:"W1",r:0},{w:"W2",r:750},{w:"W3",r:800},{w:"W4",r:800}],
    status:[{name:"Completed",value:2,color:"#10b981"},{name:"Pending",value:0,color:"#f59e0b"},{name:"Cancelled",value:1,color:"#ef4444"}],
    services:[{name:"Photography",value:1600},{name:"Short Form",value:750}]},
  "Mar 2026":{revenue:5800,completed:7,cancelled:2,pending:0,lostAmount:900,avgValue:828,
    weekly:[{w:"W1",r:1200},{w:"W2",r:1600},{w:"W3",r:1800},{w:"W4",r:1200}],
    status:[{name:"Completed",value:7,color:"#10b981"},{name:"Pending",value:0,color:"#f59e0b"},{name:"Cancelled",value:2,color:"#ef4444"}],
    services:[{name:"Photography",value:2000},{name:"Long Form",value:2200},{name:"Short Form",value:600},{name:"360 Tour",value:1000}]},
};

const CAL_EVENTS = [
  {date:"2026-06-06",id:736,property:"The Grand, JVC",          type:"Apartment",      size:"2 Bed", services:"Photography",           amount:550, status:"Shoot Booked",     user:"Ravi Menon",       slot:"Morning"  },
  {date:"2026-06-06",id:737,property:"Downtown Address, DIFC",  type:"Apartment",      size:"3 Bed", services:"360 Virtual Tour",      amount:400, status:"Shoot Booked",     user:"Fatima Al Rashidi",slot:"Afternoon"},
  {date:"2026-06-08",id:681,property:"Bluewaters Penthouse",    type:"Apartment",      size:"4 Bed", services:"Long Form Day + Night", amount:1600,status:"Shoot Booked",     user:"Sarah Mitchell",   slot:"Day+Night"},
  {date:"2026-06-10",id:718,property:"Palm Jumeirah Villa",     type:"Villa/Townhouse",size:"4 Bed", services:"Long Form Daylight",    amount:1300,status:"Awaiting Payment", user:"Ahmed Al Mansoori",slot:"Afternoon"},
  {date:"2026-06-15",id:735,property:"123, Marina, Dubai",      type:"Apartment",      size:"1 Bed", services:"Photography, Videography",amount:800,status:"Project Completed",user:"Akash",           slot:"Morning"  },
  {date:"2026-06-22",id:738,property:"Emaar Beachfront T3",     type:"Apartment",      size:"2 Bed", services:"Photography",           amount:600, status:"Shoot Booked",     user:"Priya Sharma",     slot:"Morning"  },
  {date:"2026-06-25",id:739,property:"DAMAC Hills Villa",       type:"Villa/Townhouse",size:"5 Bed", services:"Long Form Day + Night", amount:1700,status:"Shoot Booked",     user:"Rajesh Kumar",     slot:"Day+Night"},
  {date:"2026-05-05",id:692,property:"JVC Green Park",          type:"Apartment",      size:"1 Bed", services:"Short Form Video",      amount:300, status:"Cancelled",        user:"Omar Hassan",      slot:"Morning"  },
  {date:"2026-05-12",id:698,property:"Downtown Burj View",      type:"Apartment",      size:"3 Bed", services:"360 Virtual Tour",      amount:950, status:"Project Completed",user:"Priya Sharma",     slot:"Afternoon"},
  {date:"2026-05-20",id:687,property:"Arabian Ranches Villa",   type:"Villa/Townhouse",size:"3 Bed", services:"Long Form Daylight",    amount:1100,status:"Project Completed",user:"Rajesh Kumar",     slot:"Daylight" },
  {date:"2026-04-21",id:705,property:"1001 Short time Test",    type:"Apartment",      size:"Studio",services:"Photography",           amount:500, status:"Cancelled",        user:"Akash",            slot:"Morning"  },
  {date:"2026-04-29",id:709,property:"1205, Marina Heights",    type:"Apartment",      size:"2 Bed", services:"Photography",           amount:800, status:"Project Completed",user:"Akash",            slot:"Morning"  },
];

const REPORTS_DATA = [
  {m:"Jun 2026",revenue:2600, completed:2,cancelled:0,pending:2,avg:1300,lost:0,   outstanding:1300},
  {m:"May 2026",revenue:3350, completed:3,cancelled:1,pending:0,avg:950, lost:300, outstanding:0   },
  {m:"Apr 2026",revenue:2350, completed:2,cancelled:1,pending:0,avg:783, lost:500, outstanding:0   },
  {m:"Mar 2026",revenue:5800, completed:7,cancelled:2,pending:0,avg:828, lost:900, outstanding:0   },
  {m:"Feb 2026",revenue:4100, completed:5,cancelled:0,pending:0,avg:820, lost:0,   outstanding:0   },
  {m:"Jan 2026",revenue:3200, completed:4,cancelled:1,pending:0,avg:800, lost:450, outstanding:0   },
];

// Month-over-month comparison: current = Jun 2026, previous = May 2026
const CUR={revenue:2600,completed:2,pending:2,cancelled:0,avgVal:1300,expenses:784, profit:1816,outstanding:1300};
const PRV={revenue:3350,completed:3,pending:0,cancelled:1,avgVal:950, expenses:1319,profit:2031,outstanding:0};
// pctChg returns direction + label for the badge
function pctChg(c,p){if(p===0)return c>0?{d:"up",t:"New"}:{d:"flat",t:"—"};const v=Math.round(((c-p)/Math.abs(p))*100);return{d:v>=0?"up":"down",t:`${Math.abs(v)}%`};}
function fmtAED(n){return n>=1000?`AED ${(n/1000).toFixed(1)}k`:`AED ${n}`;}
function fmtK(n){const v=typeof n==="number"?n:parseFloat(n)||0;return v>=1000?`AED ${(v/1000).toFixed(1)}K`:`AED ${v}`;}

const EXP_CATS = ["Photography Equipment","Editing Software","Fuel / Transport","Marketing","Photographer Fee","Editor Fee","Subscriptions","Miscellaneous"];

const INIT_EXPENSES = [
  {id:1, cat:"Editing Software",      amount:299, date:"2026-06-01", desc:"Adobe Creative Cloud monthly",     month:"Jun 2026"},
  {id:2, cat:"Photographer Fee",      amount:400, date:"2026-06-06", desc:"Freelance photographer assist",    month:"Jun 2026"},
  {id:3, cat:"Fuel / Transport",      amount:85,  date:"2026-06-08", desc:"Marina to Bluewaters drive",       month:"Jun 2026"},
  {id:4, cat:"Photography Equipment", amount:550, date:"2026-05-15", desc:"ND filters + accessories",         month:"May 2026"},
  {id:5, cat:"Editing Software",      amount:299, date:"2026-05-01", desc:"Adobe Creative Cloud monthly",     month:"May 2026"},
  {id:6, cat:"Fuel / Transport",      amount:120, date:"2026-05-20", desc:"Arabian Ranches trip",             month:"May 2026"},
  {id:7, cat:"Editor Fee",            amount:350, date:"2026-05-22", desc:"Post-production 3 shoots",         month:"May 2026"},
  {id:8, cat:"Marketing",             amount:500, date:"2026-04-10", desc:"Instagram ads spend",              month:"Apr 2026"},
  {id:9, cat:"Editing Software",      amount:299, date:"2026-04-01", desc:"Adobe Creative Cloud monthly",     month:"Apr 2026"},
  {id:10,cat:"Editor Fee",            amount:350, date:"2026-04-29", desc:"Post-production 2 shoots",         month:"Apr 2026"},
  {id:11,cat:"Editing Software",      amount:299, date:"2026-03-01", desc:"Adobe Creative Cloud monthly",     month:"Mar 2026"},
  {id:12,cat:"Photographer Fee",      amount:800, date:"2026-03-15", desc:"Freelance photographer large jobs",month:"Mar 2026"},
  {id:13,cat:"Marketing",             amount:750, date:"2026-03-10", desc:"Google Ads + Instagram boost",     month:"Mar 2026"},
  {id:14,cat:"Editor Fee",            amount:600, date:"2026-03-25", desc:"Post-production 7 shoots",         month:"Mar 2026"},
  {id:15,cat:"Subscriptions",         amount:150, date:"2026-02-01", desc:"Dropbox + cloud storage",          month:"Feb 2026"},
  {id:16,cat:"Editing Software",      amount:299, date:"2026-02-01", desc:"Adobe Creative Cloud monthly",     month:"Feb 2026"},
  {id:17,cat:"Editing Software",      amount:299, date:"2026-01-01", desc:"Adobe Creative Cloud monthly",     month:"Jan 2026"},
  {id:18,cat:"Fuel / Transport",      amount:200, date:"2026-01-15", desc:"Multiple shoots Jan",              month:"Jan 2026"},
];

const TT  = {backgroundColor:"#18181b",border:"1px solid #52525b",borderRadius:"8px",color:"#ffffff",fontSize:"12px",padding:"8px 12px"};
const LS  = {color:"#ffffff",fontWeight:"600"};
const IS  = {color:"#e4e4e7"};
const PAL = ["#10b981","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899"];
const MN  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const SCX = {
  "Project Completed":"bg-emerald-950 text-emerald-400 border-emerald-800",
  "Awaiting Payment": "bg-amber-950  text-amber-400  border-amber-800",
  "Cancelled":        "bg-red-950    text-red-400    border-red-800",
  "Shoot Booked":     "bg-blue-950   text-blue-400   border-blue-800",
  "success":          "bg-emerald-950 text-emerald-400 border-emerald-800",
};
const SDOT = {"Project Completed":"bg-emerald-500","Awaiting Payment":"bg-amber-500","Cancelled":"bg-red-500","Shoot Booked":"bg-blue-500"};
const SBAR = {"Project Completed":"border-l-2 border-emerald-500 bg-emerald-500/10","Awaiting Payment":"border-l-2 border-amber-500 bg-amber-500/10","Cancelled":"border-l-2 border-red-500 bg-red-500/10","Shoot Booked":"border-l-2 border-blue-500 bg-blue-500/10"};

const Badge = ({s}) => <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${SCX[s]??"bg-zinc-800 text-zinc-300 border-zinc-700"}`}>{s}</span>;
const TH = ({ch}) => <th className="text-left px-4 py-3 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest whitespace-nowrap">{ch}</th>;

function PH({label="Operations",title,sub,action}){return(<div className="flex items-start justify-between mb-6"><div><p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">{label}</p><h1 className="text-xl font-bold text-white">{title}</h1>{sub&&<p className="text-xs text-zinc-500 mt-0.5">{sub}</p>}</div>{action}</div>);}
function buildGrid(y,m){const fd=new Date(y,m,1).getDay();const os=(fd+6)%7;const td=new Date(y,m+1,0).getDate();const cs=Array(os).fill(null);for(let d=1;d<=td;d++)cs.push(d);while(cs.length%7)cs.push(null);return cs;}
function evOn(y,m,d){const k=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;return CAL_EVENTS.filter(e=>e.date===k);}
function bookingsInMonth(mStr){const p=mStr.split(" ");const mi=MN.indexOf(p[0]);const prefix=`${p[1]}-${String(mi+1).padStart(2,"0")}`;return BOOKINGS.filter(b=>b.date&&b.date.startsWith(prefix));}
function getMonthStr(ds){const d=new Date(ds);return `${MN[d.getMonth()].slice(0,3)} ${d.getFullYear()}`;}

const NAV_GROUPS = [
  {label:"Workspace",items:[{id:"dashboard",label:"Dashboard",icon:LayoutDashboard},{id:"bookings",label:"Bookings",icon:CalendarIcon},{id:"calendar",label:"Calendar",icon:CalendarDays},{id:"users",label:"Users",icon:Users}]},
  {label:"Finance",  items:[{id:"invoices",label:"Invoices",icon:FileText},{id:"reports",label:"Reports",icon:BarChart2}]},
  {label:"Operations",items:[{id:"coupons",label:"Coupons",icon:Tag},{id:"timeslots",label:"Time Slots",icon:Clock},{id:"pricing",label:"Pricing",icon:DollarSign}]},
  {label:"Content",  items:[{id:"portfolio",label:"Portfolio",icon:ImageIcon},{id:"reviews",label:"Reviews",icon:Star}]},
  {label:"System",   items:[{id:"settings",label:"Settings",icon:Settings}]},
];

/* ── DRILL MODAL: shown when clicking any KPI card ── */
function DrillModal({title,subtitle,bookings=[],extra,onClose}){
  const total  = bookings.reduce((a,b)=>a+b.amount,0);
  const avgVal = bookings.length ? Math.round(total/bookings.length) : 0;
  const svMap  = {};
  bookings.forEach(b=>{const s=b.services?.split(",")[0].trim()||"Other";svMap[s]=(svMap[s]||0)+b.amount;});
  const svData = Object.entries(svMap).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  return(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
          <div><p className="text-base font-bold text-white">{title}</p>{subtitle&&<p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p>}</div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 transition-colors"><X size={16}/></button>
        </div>
        <div className="p-6 space-y-5">
          {bookings.length>0&&(
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-white">{bookings.length}</p><p className="text-xs text-zinc-500 mt-1">Bookings</p></div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-emerald-400">AED {total.toLocaleString()}</p><p className="text-xs text-zinc-500 mt-1">Total Value</p></div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center"><p className="text-2xl font-bold text-violet-400">AED {avgVal.toLocaleString()}</p><p className="text-xs text-zinc-500 mt-1">Avg Value</p></div>
            </div>
          )}
          {svData.length>1&&(
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Revenue by Service</p>
              <div className="space-y-2.5">
                {svData.map((sv,i)=>{const pct=total>0?Math.round((sv.value/total)*100):0;return(
                  <div key={i}><div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor:PAL[i%PAL.length]}}/><span className="text-xs text-zinc-300">{sv.name}</span></div><span className="text-xs font-semibold text-white">AED {sv.value.toLocaleString()} <span className="text-zinc-500 font-normal">({pct}%)</span></span></div><div className="w-full bg-zinc-800 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{width:`${pct}%`,backgroundColor:PAL[i%PAL.length]}}/></div></div>
                );})}
              </div>
            </div>
          )}
          {extra}
          {bookings.length===0?(
            <div className="py-10 text-center"><div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-3"><CalendarIcon size={20} className="text-zinc-600"/></div><p className="text-sm text-zinc-400 font-medium">No bookings in this category</p></div>
          ):(
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead><tr className="border-b border-zinc-800"><TH ch="ID"/><TH ch="Property"/><TH ch="Client"/><TH ch="Date"/><TH ch="Amount"/><TH ch="Status"/></tr></thead>
                <tbody className="divide-y divide-zinc-800">
                  {bookings.map(b=>(
                    <tr key={b.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-zinc-500 font-mono">{b.id}</td>
                      <td className="px-4 py-3"><p className="text-sm text-white font-medium">{b.property}</p><p className="text-xs text-zinc-500">{b.type} &middot; {b.size}</p></td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{b.user}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{b.date||"?"}</td>
                      <td className="px-4 py-3 text-sm font-bold text-white">AED {b.amount.toLocaleString()}</td>
                      <td className="px-4 py-3"><Badge s={b.status}/></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t border-zinc-700 bg-zinc-800/50"><td colSpan={4} className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase">Total</td><td className="px-4 py-3 text-sm font-black text-emerald-400">AED {total.toLocaleString()}</td><td/></tr></tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── EXPENSE FORM MODAL ── */
function ExpenseFormModal({initial,onSave,onClose}){
  const [form,setForm]=useState(initial||{cat:"",amount:"",date:"",desc:""});
  const valid=form.cat&&form.amount&&form.date;
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  return(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <p className="text-sm font-bold text-white">{initial?.id?"Edit Expense":"Add Expense"}</p>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1"><X size={16}/></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block font-medium">Category <span className="text-red-400">*</span></label>
            <select value={form.cat} onChange={e=>upd("cat",e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500 transition-colors">
              <option value="">Select category...</option>
              {EXP_CATS.map(c=><option key={c} value={c} className="bg-zinc-900">{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block font-medium">Amount (AED) <span className="text-red-400">*</span></label>
            <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-semibold">AED</span><input type="number" placeholder="0.00" value={form.amount} onChange={e=>upd("amount",e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500 transition-colors"/></div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block font-medium">Date <span className="text-red-400">*</span></label>
            <input type="date" value={form.date} onChange={e=>upd("date",e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500 transition-colors"/>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1.5 block font-medium">Description</label>
            <input type="text" placeholder="e.g. Adobe CC subscription" value={form.desc} onChange={e=>upd("desc",e.target.value)} className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500 transition-colors"/>
          </div>
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 font-medium transition-colors">Cancel</button>
            <button onClick={()=>valid&&onSave({...form,amount:parseFloat(form.amount),month:getMonthStr(form.date)})} disabled={!valid} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${valid?"bg-emerald-600 hover:bg-emerald-500 text-white":"bg-zinc-700 text-zinc-500 cursor-not-allowed"}`}>
              {initial?.id?"Save Changes":"Add Expense"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


/* ── SERVICE BADGE HELPERS ── */
const SVC_MAP=[
  {k:"360",    label:"360° Tour",    cx:"bg-amber-950  text-amber-400  border-amber-800"},
  {k:"virtual",label:"360° Tour",    cx:"bg-amber-950  text-amber-400  border-amber-800"},
  {k:"short",  label:"Short Video",  cx:"bg-violet-950 text-violet-400 border-violet-800"},
  {k:"long",   label:"Long Video",   cx:"bg-blue-950   text-blue-400   border-blue-800"},
  {k:"photo",  label:"Photography",  cx:"bg-emerald-950 text-emerald-400 border-emerald-800"},
  {k:"video",  label:"Videography",  cx:"bg-cyan-950   text-cyan-400   border-cyan-800"},
];
function SvcBadge({svc}){
  const s=svc.toLowerCase();
  const m=SVC_MAP.find(x=>s.includes(x.k))||{label:svc,cx:"bg-zinc-800 text-zinc-400 border-zinc-700"};
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${m.cx}`}>{m.label}</span>;
}
function SvcBadges({services}){
  const parts=(services||"").split(",").map(s=>s.trim()).filter(Boolean);
  return <div className="flex flex-wrap gap-1">{parts.map((s,i)=><SvcBadge key={i} svc={s}/>)}</div>;
}
/* ── TODAY SCHEDULE ── */
function TodaySchedule({go}){
  const TODAY="2026-06-06";
  const shoots=CAL_EVENTS.filter(e=>e.date===TODAY);
  const SLOT_TIME={Morning:"09:00 – 12:00",Afternoon:"13:00 – 16:00",Evening:"17:00 – 20:00","Day+Night":"09:00 – 20:00",Daylight:"09:00 – 16:00"};
  const SLOT_START={Morning:"09:00",Afternoon:"13:00",Evening:"17:00","Day+Night":"09:00",Daylight:"09:00"};
  const todayRev=shoots.reduce((a,b)=>a+b.amount,0);
  const upcoming=CAL_EVENTS.filter(e=>e.date>TODAY&&e.date.startsWith("2026-06")).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,5);
  return(
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div>
          <p className="text-sm font-semibold text-white">Today's Schedule</p>
          <p className="text-xs text-zinc-500 mt-0.5">Saturday, Jun 6 &middot; {shoots.length} shoot{shoots.length!==1?"s":""} &middot; AED {todayRev.toLocaleString()} total today</p>
        </div>
        <button onClick={()=>go("calendar")} className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">Full calendar &rarr;</button>
      </div>

      {/* Today's shoots */}
      {shoots.length===0?(
        <div className="py-10 text-center"><div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-2"><CalendarIcon size={18} className="text-zinc-600"/></div><p className="text-sm text-zinc-500">No shoots scheduled today</p></div>
      ):(
        <div className="divide-y divide-zinc-800">
          {shoots.map((s,i)=>(
            <div key={i} className={`px-5 py-4 ${SBAR[s.status]??""}`}>
              <div className="grid grid-cols-12 gap-4 items-start">
                {/* Time column */}
                <div className="col-span-2">
                  <p className="text-base font-bold text-white">{SLOT_START[s.slot]??"09:00"}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 leading-tight">{SLOT_TIME[s.slot]}</p>
                  <span className="inline-block text-[9px] font-semibold text-zinc-600 uppercase tracking-wider mt-1">{s.slot}</span>
                </div>
                {/* Property */}
                <div className="col-span-3">
                  <p className="text-sm font-semibold text-white leading-tight">{s.property}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{s.type} &middot; {s.size}</p>
                </div>
                {/* Client + services */}
                <div className="col-span-4">
                  <p className="text-sm text-zinc-300 font-medium mb-1.5">{s.user}</p>
                  <SvcBadges services={s.services}/>
                </div>
                {/* Amount + status + WA buttons */}
                <div className="col-span-3 text-right">
                  <p className="text-base font-bold text-white">AED {s.amount.toLocaleString()}</p>
                  <div className="mt-1"><Badge s={s.status}/></div>
                  <div className="flex flex-wrap gap-1 justify-end mt-2">
                    {["On Way","Arrived","Photos Done"].map(t=>(
                      <button key={t} className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500 px-1.5 py-0.5 rounded transition-colors">&#128242; {t}</button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming this month */}
      <div className="border-t border-zinc-800 px-5 py-4">
        <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold mb-3">Upcoming This Month</p>
        <div className="space-y-2.5">
          {upcoming.map((e,i)=>{
            const d=new Date(e.date);
            return(
              <div key={i} className="grid grid-cols-12 items-center gap-2">
                <div className="col-span-1 flex items-center justify-center"><div className={`w-2 h-2 rounded-full ${SDOT[e.status]??"bg-zinc-600"}`}/></div>
                <div className="col-span-2"><span className="text-xs text-zinc-400 font-medium">{d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</span></div>
                <div className="col-span-4"><span className="text-xs text-zinc-300 truncate block">{e.property}</span><span className="text-[10px] text-zinc-600">{e.type} &middot; {e.size}</span></div>
                <div className="col-span-3"><SvcBadges services={e.services}/></div>
                <div className="col-span-2 text-right"><span className="text-xs font-bold text-white">AED {e.amount}</span></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── EXPENSE CATEGORY MODAL ── */
function ExpenseCatModal({expenses, catName, onClose}){
  const [sel,setSel]=useState(null);
  const inDetail=catName||sel;
  const detailCat=catName||sel;
  const detailItems=catName
    ?[...expenses].sort((a,b)=>b.date.localeCompare(a.date))
    :sel?expenses.filter(e=>e.cat===sel).sort((a,b)=>b.date.localeCompare(a.date)):[];
  const detailTotal=detailItems.reduce((a,b)=>a+b.amount,0);
  const total=expenses.reduce((a,b)=>a+b.amount,0);
  const catMap={};expenses.forEach(e=>{if(!catMap[e.cat])catMap[e.cat]=[];catMap[e.cat].push(e);});
  const cats=Object.entries(catMap).map(([cat,items])=>({cat,items,total:items.reduce((a,b)=>a+b.amount,0)})).sort((a,b)=>b.total-a.total);
  return(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950 z-10">
          {inDetail?(
            <div className="flex items-center gap-3">
              {sel&&!catName&&<button onClick={()=>setSel(null)} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white font-medium transition-colors"><ChevronLeft size={13}/> All Categories</button>}
              <div><p className="text-sm font-bold text-white">{detailCat}</p><p className="text-xs text-zinc-500 mt-0.5">{detailItems.length} entries &middot; {fmtK(detailTotal)} total</p></div>
            </div>
          ):(
            <div><p className="text-base font-bold text-white">Expense Breakdown</p><p className="text-xs text-zinc-500 mt-0.5">{fmtK(total)} across {expenses.length} entries &middot; click a category for details</p></div>
          )}
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 transition-colors flex-shrink-0"><X size={16}/></button>
        </div>
        <div className="p-6">
          {!inDetail?(
            <div className="space-y-2.5">
              {cats.map((cat,i)=>{const pct=total>0?Math.round((cat.total/total)*100):0;return(
                <button key={i} onClick={()=>setSel(cat.cat)}
                  className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-600 hover:bg-zinc-800/60 transition-all group">
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full flex-shrink-0" style={{backgroundColor:PAL[i%PAL.length]}}/><span className="text-sm font-semibold text-white">{cat.cat}</span><span className="text-xs text-zinc-600">{cat.items.length} {cat.items.length===1?"entry":"entries"}</span></div>
                    <div className="flex items-center gap-2"><span className="text-sm font-bold text-red-400">{fmtK(cat.total)}</span><span className="text-xs text-zinc-600">{pct}%</span><ArrowUpRight size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors"/></div>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{width:`${pct}%`,backgroundColor:PAL[i%PAL.length]}}/></div>
                </button>
              );})}
              <div className="border-t border-zinc-800 pt-3 flex items-center justify-between"><span className="text-xs font-bold text-zinc-400 uppercase tracking-wide">Total</span><span className="text-sm font-black text-red-400">{fmtK(total)}</span></div>
            </div>
          ):(
            <div className="space-y-4">
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <p className="text-xs text-zinc-500 mb-1">Total spent &mdash; {detailCat}</p>
                <p className="text-2xl font-bold text-red-400">{fmtK(detailTotal)}</p>
                <p className="text-xs text-zinc-600 mt-0.5">{detailItems.length} expense {detailItems.length===1?"entry":"entries"}</p>
              </div>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-zinc-800"><TH ch="Date"/><TH ch="Description"/><TH ch="Amount"/></tr></thead>
                  <tbody className="divide-y divide-zinc-800">
                    {detailItems.map((exp,i)=>(
                      <tr key={i} className="hover:bg-zinc-800/40 transition-colors">
                        <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">{new Date(exp.date).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"2-digit"})}</td>
                        <td className="px-4 py-3 text-sm text-zinc-300">{exp.desc||"—"}</td>
                        <td className="px-4 py-3 text-sm font-bold text-red-400 whitespace-nowrap">{fmtK(exp.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot><tr className="border-t border-zinc-700 bg-zinc-800/50"><td colSpan={2} className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wide">Total</td><td className="px-4 py-3 text-sm font-black text-red-400">{fmtK(detailTotal)}</td></tr></tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── PROFIT DETAIL MODAL ── */
function ProfitModal({revenue, expenses, bookings, onClose}){
  const profit=revenue-expenses;
  const margin=revenue>0?Math.round((profit/revenue)*100):0;
  return(
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[88vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950">
          <div><p className="text-base font-bold text-white">Net Profit &mdash; Jun 2026</p><p className="text-xs text-zinc-500 mt-0.5">Total revenue minus total expenses this month</p></div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white p-1 transition-colors"><X size={16}/></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"/><span className="text-sm text-zinc-300 font-medium">Total Revenue</span></div>
              <span className="text-sm font-bold text-emerald-400">+ {fmtK(revenue)}</span>
            </div>
            <div className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-red-500"/><span className="text-sm text-zinc-300 font-medium">Total Expenses</span></div>
              <span className="text-sm font-bold text-red-400">&minus; {fmtK(expenses)}</span>
            </div>
            <div className="border-t-2 border-zinc-700 pt-3 flex items-center justify-between">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"/><span className="text-sm font-bold text-white">Net Profit</span></div>
              <div className="flex items-center gap-2.5">
                <span className="text-xl font-black text-blue-400">{fmtK(profit)}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${margin>=50?"bg-emerald-950 text-emerald-400 border-emerald-800":margin>=30?"bg-amber-950 text-amber-400 border-amber-800":"bg-red-950 text-red-400 border-red-800"}`}>{margin}% margin</span>
              </div>
            </div>
          </div>
          {bookings.length>0&&(
            <div>
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Revenue from Completed Shoots</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead><tr className="border-b border-zinc-800"><TH ch="Property"/><TH ch="Client"/><TH ch="Date"/><TH ch="Amount"/></tr></thead>
                  <tbody className="divide-y divide-zinc-800">
                    {bookings.map(b=>(<tr key={b.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="px-4 py-3"><p className="text-sm text-white font-medium">{b.property}</p><p className="text-xs text-zinc-500">{b.type} &middot; {b.size}</p></td>
                      <td className="px-4 py-3 text-sm text-zinc-300">{b.user}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">{b.date||"—"}</td>
                      <td className="px-4 py-3 text-sm font-bold text-emerald-400 whitespace-nowrap">AED {b.amount.toLocaleString()}</td>
                    </tr>))}
                  </tbody>
                  <tfoot><tr className="border-t border-zinc-700 bg-zinc-800/50"><td colSpan={3} className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase">Total Revenue</td><td className="px-4 py-3 text-sm font-black text-emerald-400">{fmtK(revenue)}</td></tr></tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ── DASHBOARD ── */
function Dashboard({go}){
  const [drill,setDrill]=useState(null);
  const [showExpDrill,setShowExpDrill]=useState(false);
  const [showProfitDrill,setShowProfitDrill]=useState(false);

  // Aggregate data
  const ytd    = MONTHLY_TREND.reduce((a,b)=>a+b.revenue,0);
  const done   = BOOKINGS.filter(b=>b.status==="Project Completed");
  const pend   = BOOKINGS.filter(b=>["Shoot Booked","Awaiting Payment"].includes(b.status));
  const avgVal = done.length?Math.round(done.reduce((a,b)=>a+b.amount,0)/done.length):0;
  const junDone = done.filter(b=>b.date?.startsWith("2026-06"));
  const junExpenses = INIT_EXPENSES.filter(e=>e.month==="Jun 2026");

  // Revenue by service (Jun 2026 MTD from FIN_DATA)
  const svcRev = FIN_DATA["Jun 2026"].services;

  // Monthly revenue table for Revenue drill
  const revenueExtra=(
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <table className="w-full"><thead><tr className="border-b border-zinc-800"><TH ch="Month"/><TH ch="Revenue"/><TH ch="Shoots"/></tr></thead>
      <tbody className="divide-y divide-zinc-800">{MONTHLY_TREND.map((m,i)=>(<tr key={i} className="hover:bg-zinc-800/40"><td className="px-4 py-3 text-sm font-semibold text-white">{m.month} 2026</td><td className="px-4 py-3 text-sm font-bold text-emerald-400">{fmtK(m.revenue)}</td><td className="px-4 py-3 text-sm text-zinc-300">{m.completed}</td></tr>))}</tbody>
      <tfoot><tr className="border-t border-zinc-700 bg-zinc-800/50"><td className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase">Total</td><td className="px-4 py-3 text-sm font-black text-emerald-400">{fmtK(ytd)}</td><td className="px-4 py-3 text-sm font-black text-white">{MONTHLY_TREND.reduce((a,b)=>a+b.completed,0)}</td></tr></tfoot>
      </table>
    </div>
  );

  // 6 KPI cards — 2 rows of 3 (no cancelled, no outstanding — prepaid service)
  const cards = [
    { key:"revenue",  label:"TOTAL REVENUE",     cur:CUR.revenue,  prev:PRV.revenue,  fmt:v=>fmtK(v), prevFmt:v=>`AED ${v.toLocaleString()}`,
      drill:{title:"Revenue YTD — All Completed Bookings",subtitle:"Income from every completed project year to date",bookings:done,extra:revenueExtra}},
    { key:"completed",label:"COMPLETED BOOKINGS",cur:CUR.completed,prev:PRV.completed,fmt:v=>v,        prevFmt:v=>v,
      drill:{title:"Completed Bookings — Jun 2026",subtitle:"Projects fully delivered this month",bookings:junDone}},
    { key:"pending",  label:"PENDING SHOOTS",     cur:CUR.pending,  prev:PRV.pending,  fmt:v=>v,        prevFmt:v=>v,
      drill:{title:"Pending Shoots — Jun 2026",subtitle:"Shoots booked but not yet completed",bookings:pend}},
    { key:"avgVal",   label:"AVG BOOKING VALUE",  cur:CUR.avgVal,   prev:PRV.avgVal,   fmt:v=>fmtK(v), prevFmt:v=>`AED ${v.toLocaleString()}`,
      drill:{title:"Average Booking Value",subtitle:`AED ${avgVal.toLocaleString()} avg across ${done.length} completed projects`,bookings:[...done].sort((a,b)=>b.amount-a.amount)}},
    { key:"expenses", label:"TOTAL EXPENSES",      cur:CUR.expenses, prev:PRV.expenses, fmt:v=>fmtK(v), prevFmt:v=>`AED ${v.toLocaleString()}`,
      expDrill:true},
    { key:"profit",   label:"NET PROFIT (MTD)",    cur:CUR.profit,   prev:PRV.profit,   fmt:v=>fmtK(v), prevFmt:v=>`AED ${v.toLocaleString()}`,
      profitDrill:true},
  ];

  // Colour logic per card
  const cardColor = {revenue:"text-emerald-400",completed:"text-blue-400",pending:"text-amber-400",avgVal:"text-violet-400",expenses:"text-red-400",profit:"text-blue-400"};
  // For expenses: going DOWN is good (lower = better)
  const invertKeys = new Set(["expenses"]);

  return(
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Real-time overview of bookings, revenue and expenses &middot; Jun 2026</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"><CalendarDays size={13}/> Last 30 days</button>
          <button className="flex items-center gap-2 bg-white text-black text-xs font-bold px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors"><Download size={13}/> Export</button>
        </div>
      </div>

      {/* 6 KPI Cards — 2 rows of 3 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {cards.map((c,i)=>{
          const chg = pctChg(c.cur, c.prev);
          const isInvert = invertKeys.has(c.key);
          const badgeUp  = isInvert ? chg.d==="down" : chg.d==="up";
          const badgeCx  = chg.d==="flat" ? "text-zinc-500 bg-zinc-800" : badgeUp ? "text-emerald-400 bg-emerald-950 border border-emerald-900" : "text-red-400 bg-red-950 border border-red-900";
          const arrow    = chg.d==="up" ? "↑" : chg.d==="down" ? "↓" : "";
          const col      = cardColor[c.key] ?? "text-white";
          return(
            <button key={c.key} onClick={()=>c.expDrill?setShowExpDrill(true):c.profitDrill?setShowProfitDrill(true):c.drill&&setDrill(i)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-600 hover:bg-zinc-800/50 transition-all group">
              {/* Label row + badge */}
              <div className="flex items-start justify-between mb-4">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold leading-tight">{c.label}</p>
                {chg.d!=="flat"&&<span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${badgeCx} flex-shrink-0 ml-2`}>{arrow} {chg.t}</span>}
              </div>
              {/* Main value */}
              <p className={`text-2xl font-bold ${col} tracking-tight mb-2`}>{c.fmt(c.cur)}</p>
              {/* vs last month */}
              <div className="border-t border-zinc-800 pt-3 mt-1">
                <p className="text-xs text-zinc-500">vs {c.prevFmt(c.prev)} last month</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Revenue trend + Revenue by service */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <div><p className="text-sm font-semibold text-white">Revenue trend</p><p className="text-xs text-zinc-500">Monthly revenue &middot; last 6 months</p></div>
            <span className="text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-400 px-2 py-0.5 rounded-lg font-semibold">AED</span>
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={MONTHLY_TREND} margin={{top:8,right:4,left:-20,bottom:0}}>
              <defs><linearGradient id="rg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="100%" stopColor="#10b981" stopOpacity={0.02}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
              <XAxis dataKey="month" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1000?`${v/1000}k`:v}/>
              <Tooltip contentStyle={TT} formatter={v=>[`AED ${v.toLocaleString()}`,"Revenue"]}/>
              <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fill="url(#rg2)" dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm font-semibold text-white mb-0.5">Revenue by service</p>
          <p className="text-xs text-zinc-500 mb-4">This month (Jun 2026)</p>
          <div className="relative">
            <ResponsiveContainer width="100%" height={195}>
              <PieChart>
                <Pie data={svcRev} cx="50%" cy="50%" innerRadius={62} outerRadius={88} dataKey="value" paddingAngle={4}>
                  {svcRev.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}
                </Pie>
                <Tooltip contentStyle={TT} labelStyle={LS} itemStyle={IS} formatter={(v)=>[fmtK(v),""]}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-base font-bold text-white">{fmtK(svcRev.reduce((a,b)=>a+b.value,0))}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">total revenue</p>
              </div>
            </div>
          </div>
          <div className="space-y-2 mt-3">
            {svcRev.map((item,i)=>(
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor:PAL[i]}}/><span className="text-xs text-zinc-400">{item.name}</span></div>
                <span className="text-xs font-bold text-white">{fmtK(item.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Today's Schedule — full width */}
      <TodaySchedule go={go}/>

      {/* Recent Bookings — full width table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <p className="text-sm font-semibold text-white">Recent Bookings</p>
            <p className="text-xs text-zinc-500 mt-0.5">Latest {Math.min(BOOKINGS.length,7)} bookings across all statuses</p>
          </div>
          <button onClick={()=>go("bookings")} className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium">View all &rarr;</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left px-4 py-3 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Property</th>
                <th className="text-left px-4 py-3 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Client</th>
                <th className="text-left px-4 py-3 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Date</th>
                <th className="text-left px-4 py-3 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Services</th>
                <th className="text-left px-4 py-3 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Amount</th>
                <th className="text-left px-4 py-3 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {BOOKINGS.slice(0,7).map(b=>(
                <tr key={b.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <p className="text-sm text-white font-medium">{b.property}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{b.type} &middot; {b.size}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-zinc-300 whitespace-nowrap">{b.user}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">{b.date||"—"}</td>
                  <td className="px-4 py-3"><SvcBadges services={b.services}/></td>
                  <td className="px-4 py-3 text-sm font-bold text-white whitespace-nowrap">AED {b.amount.toLocaleString()}</td>
                  <td className="px-4 py-3"><Badge s={b.status}/></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[{label:"Manage Bookings",sub:`${BOOKINGS.length} total`,page:"bookings",icon:CalendarIcon,color:"text-blue-400"},{label:"Calendar View",sub:"Shoots & availability",page:"calendar",icon:CalendarDays,color:"text-violet-400"},{label:"P&L Reports",sub:"Expenses & profit",page:"reports",icon:BarChart2,color:"text-emerald-400"},{label:"Portfolio Works",sub:`${PORTFOLIO.length} entries`,page:"portfolio",icon:ImageIcon,color:"text-pink-400"}].map((c,i)=>(
          <button key={i} onClick={()=>go(c.page)} className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 rounded-xl p-4 text-left transition-all">
            <c.icon size={16} className={`${c.color} mb-3`}/>
            <p className="text-sm font-semibold text-white">{c.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{c.sub}</p>
          </button>
        ))}
      </div>

      {/* Drill modals */}
      {drill!==null&&cards[drill]?.drill&&(
        <DrillModal title={cards[drill].drill.title} subtitle={cards[drill].drill.subtitle} bookings={cards[drill].drill.bookings??[]} extra={cards[drill].drill.extra} onClose={()=>setDrill(null)}/>
      )}
      {showExpDrill&&<ExpenseCatModal expenses={junExpenses} onClose={()=>setShowExpDrill(false)}/>}
      {showProfitDrill&&<ProfitModal revenue={CUR.revenue} expenses={CUR.expenses} bookings={junDone} onClose={()=>setShowProfitDrill(false)}/>}
    </div>
  );
}

/* ── BOOKINGS ── */
function BookingsPage(){
  const [filter,setFilter]=useState("all");
  const [modal,setModal]=useState(null);
  const counts={all:BOOKINGS.length,completed:BOOKINGS.filter(b=>b.status==="Project Completed").length,pending:BOOKINGS.filter(b=>["Shoot Booked","Awaiting Payment"].includes(b.status)).length,cancelled:BOOKINGS.filter(b=>b.status==="Cancelled").length};
  const list=BOOKINGS.filter(b=>{if(filter==="completed")return b.status==="Project Completed";if(filter==="pending")return["Shoot Booked","Awaiting Payment"].includes(b.status);if(filter==="cancelled")return b.status==="Cancelled";return true;});
  return(
    <div className="p-6">
      <PH title="Bookings" action={<button className="flex items-center gap-2 bg-white text-black text-xs font-bold px-3.5 py-2 rounded-lg hover:bg-zinc-100 transition-colors"><Plus size={13}/> New Booking</button>}/>
      <div className="flex gap-2 mb-5 flex-wrap">{["all","completed","pending","cancelled"].map(f=>(<button key={f} onClick={()=>setFilter(f)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${filter===f?"bg-white text-black":"bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"}`}>{f==="all"?"All":f.charAt(0).toUpperCase()+f.slice(1)} ({counts[f]})</button>))}</div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full"><thead><tr className="border-b border-zinc-800"><TH ch="ID"/><TH ch="Property"/><TH ch="Date"/><TH ch="Amount"/><TH ch="Status"/><TH ch="Action"/></tr></thead>
        <tbody className="divide-y divide-zinc-800">{list.map(b=>(<tr key={b.id} className="hover:bg-zinc-800/40 transition-colors"><td className="px-4 py-3.5 text-xs text-zinc-500 font-mono">{b.id}</td><td className="px-4 py-3.5"><p className="text-sm text-white font-medium">{b.property}</p><p className="text-xs text-zinc-500">{b.type} &middot; {b.size}</p></td><td className="px-4 py-3.5 text-sm text-zinc-400">{b.date||"?"}</td><td className="px-4 py-3.5 text-sm font-bold text-white">AED {b.amount.toLocaleString()}</td><td className="px-4 py-3.5"><Badge s={b.status}/></td><td className="px-4 py-3.5"><button onClick={()=>setModal(b)} className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">View &rarr;</button></td></tr>))}</tbody></table>
      </div>
      {modal&&(<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={e=>e.target===e.currentTarget&&setModal(null)}><div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl"><div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 sticky top-0 bg-zinc-950"><div><p className="text-sm font-bold text-white">Booking #{modal.id}</p><p className="text-xs text-zinc-500">{modal.date}</p></div><button onClick={()=>setModal(null)} className="text-zinc-500 hover:text-white p-1"><X size={16}/></button></div><div className="p-5 space-y-4"><div className="grid grid-cols-2 gap-4"><div><p className="text-[10px] text-zinc-600 uppercase mb-1">User</p><p className="text-sm font-semibold text-white">{modal.user}</p><p className="text-xs text-zinc-500">{modal.email}</p></div><div><p className="text-[10px] text-zinc-600 uppercase mb-1">Slot</p><p className="text-sm font-semibold text-white">{modal.slot}</p></div></div><div className="bg-zinc-900 rounded-xl p-4"><p className="text-[10px] text-zinc-600 uppercase mb-2">Services</p><p className="text-sm text-white font-medium">{modal.services}</p></div><div className="bg-zinc-900 rounded-xl p-4 space-y-2"><p className="text-[10px] text-zinc-600 uppercase mb-1">Property</p>{[["Type",modal.type],["Size",modal.size],["Address",modal.property]].map(([k,v])=>(<div key={k} className="flex items-start justify-between gap-2"><span className="text-xs text-zinc-500 flex-shrink-0">{k}:</span><span className="text-xs text-white text-right">{v}</span></div>))}</div><div className="bg-zinc-900 rounded-xl p-4"><p className="text-[10px] text-zinc-600 uppercase mb-3">Transaction</p><div className="flex items-center justify-between"><div><p className="text-2xl font-bold text-white">AED {modal.amount.toLocaleString()}</p><p className="text-xs text-zinc-500 mt-0.5">Booking value</p></div><div className="text-right space-y-2"><Badge s={modal.status}/><button className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white mt-2 ml-auto"><Download size={11}/> Invoice</button></div></div></div><div className="bg-zinc-900 rounded-xl p-4"><p className="text-[10px] text-zinc-600 uppercase mb-3">Delivery Workflow</p><div className="flex items-center justify-between">{["Booked","Shoot Done","Editing","Uploaded","Completed"].map((step,i)=>{const d=modal.status==="Project Completed"||i===0;return(<div key={i} className="flex flex-col items-center flex-1"><div className={`w-6 h-6 rounded-full flex items-center justify-center mb-1.5 ${d?"bg-emerald-500":"bg-zinc-700"}`}><span className="text-[9px] font-bold text-white">{d?"v":""}</span></div><span className="text-[8px] text-zinc-600 text-center">{step}</span></div>);})}</div></div><div><p className="text-[10px] text-zinc-600 uppercase mb-2">WhatsApp Triggers</p><div className="flex flex-wrap gap-2">{["Team On Way","Team Arrived","Photos Ready","All Media Delivered"].map(t=>(<button key={t} className="text-xs bg-zinc-900 border border-zinc-700 text-zinc-300 px-2.5 py-1.5 rounded-lg hover:border-zinc-500 transition-colors">{t}</button>))}</div></div></div></div></div>)}
    </div>
  );
}

/* ── CALENDAR ── */
function CalendarPage(){
  const [cy,setCy]=useState(2026);const [cm,setCm]=useState(5);const [sel,setSel]=useState(6);
  const cells=buildGrid(cy,cm);const selEvs=sel?evOn(cy,cm,sel):[];
  const dLabel=sel?new Date(cy,cm,sel).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"}):"";
  const prevM=()=>{if(cm===0){setCy(y=>y-1);setCm(11);}else setCm(m=>m-1);};
  const nextM=()=>{if(cm===11){setCy(y=>y+1);setCm(0);}else setCm(m=>m+1);};
  const isToday=(d)=>d===6&&cm===5&&cy===2026;
  const upcoming=CAL_EVENTS.filter(e=>e.date>=`${cy}-${String(cm+1).padStart(2,"0")}-01`).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,8);
  return(
    <div className="p-6 space-y-5">
      <PH label="Workspace" title="Calendar" sub="View and manage all scheduled shoots and availability."/>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5"><h2 className="text-base font-bold text-white">{MN[cm]} {cy}</h2><div className="flex items-center gap-1"><button onClick={prevM} className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"><ChevronLeft size={14} className="text-zinc-400"/></button><button onClick={()=>{setCy(2026);setCm(5);setSel(6);}} className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-400 font-medium transition-colors">Today</button><button onClick={nextM} className="w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"><ChevronRight size={14} className="text-zinc-400"/></button></div></div>
          <div className="flex gap-4 mb-4">{[["Completed","bg-emerald-500"],["Booked","bg-blue-500"],["Awaiting","bg-amber-500"],["Cancelled","bg-red-500"]].map(([l,c])=>(<div key={l} className="flex items-center gap-1.5"><div className={`w-2 h-2 rounded-full ${c}`}/><span className="text-[10px] text-zinc-500">{l}</span></div>))}</div>
          <div className="grid grid-cols-7 gap-1 mb-1">{["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=><div key={d} className="text-[10px] text-zinc-600 font-semibold text-center py-1">{d}</div>)}</div>
          <div className="grid grid-cols-7 gap-1">{cells.map((day,idx)=>{if(!day)return<div key={idx}/>;const evs=evOn(cy,cm,day);const active=day===sel;const today=isToday(day);return(<button key={idx} onClick={()=>setSel(day)} className={`rounded-xl p-1.5 text-left transition-all hover:bg-zinc-800 ${active?"bg-zinc-800 ring-1 ring-zinc-600":""} ${today?"ring-1 ring-emerald-500":""}`}><div className={`text-[11px] font-semibold mb-1 text-center w-5 h-5 rounded-full flex items-center justify-center mx-auto ${today?"bg-emerald-500 text-white":active?"text-white":"text-zinc-400"}`}>{day}</div><div className="space-y-0.5">{evs.slice(0,2).map((e,i)=><div key={i} className={`h-1.5 rounded-full ${SDOT[e.status]??"bg-zinc-600"}`}/>)}{evs.length>2&&<div className="text-[8px] text-zinc-600 text-center">+{evs.length-2}</div>}</div></button>);})}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col">
          <div className="px-5 py-4 border-b border-zinc-800"><p className="text-sm font-bold text-white">{sel?dLabel:"Select a day"}</p>{sel&&<p className="text-xs text-zinc-500 mt-0.5">{selEvs.length} shoot{selEvs.length!==1?"s":""} scheduled</p>}</div>
          <div className="flex-1 overflow-y-auto">{!sel?<div className="py-12 text-center text-zinc-600 text-xs">Click a date</div>:selEvs.length===0?(<div className="py-10 text-center"><div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-2"><CalendarIcon size={16} className="text-zinc-600"/></div><p className="text-sm text-zinc-500 font-medium">Day available</p><p className="text-xs text-zinc-600 mt-0.5">No shoots scheduled</p></div>):(<div className="divide-y divide-zinc-800">{selEvs.map((e,i)=>(<div key={i} className="p-4"><div className="flex items-start justify-between mb-2"><Badge s={e.status}/><span className="text-sm font-bold text-white">AED {e.amount}</span></div><p className="text-sm font-semibold text-white">{e.property}</p><p className="text-xs text-zinc-400 mt-1">{e.user}</p><div className="mt-2 space-y-1"><div className="flex items-center gap-1.5 text-xs text-zinc-500"><Clock size={10}/>{e.slot}</div><div className="flex items-center gap-1.5 text-xs text-zinc-500"><Camera size={10}/>{e.services}</div><div className="flex items-center gap-1.5 text-xs text-zinc-500"><ImageIcon size={10}/>{e.type} &middot; {e.size}</div></div></div>))}</div>)}</div>
          <div className="border-t border-zinc-800 p-4 space-y-2"><button className="w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors">Block This Day</button><button className="w-full py-2 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-xs font-semibold text-blue-400 border border-blue-800 transition-colors">+ Add Manual Shoot</button></div>
        </div>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800"><p className="text-sm font-semibold text-white">Upcoming &mdash; {MN[cm]} {cy}</p><p className="text-xs text-zinc-500 mt-0.5">Click a row to jump to that date</p></div>
        <table className="w-full"><thead><tr className="border-b border-zinc-800"><TH ch="Date"/><TH ch="Property"/><TH ch="Client"/><TH ch="Services"/><TH ch="Slot"/><TH ch="Amount"/><TH ch="Status"/></tr></thead>
        <tbody className="divide-y divide-zinc-800">{upcoming.map((e,i)=>{const d=new Date(e.date);return(<tr key={i} className="hover:bg-zinc-800/40 transition-colors cursor-pointer" onClick={()=>{setCm(d.getMonth());setCy(d.getFullYear());setSel(d.getDate());}}><td className="px-4 py-3"><p className="text-sm font-semibold text-white">{d.toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</p><p className="text-[10px] text-zinc-600">{d.toLocaleDateString("en-GB",{weekday:"short"})}</p></td><td className="px-4 py-3"><p className="text-sm text-white font-medium">{e.property}</p><p className="text-xs text-zinc-500">{e.type} &middot; {e.size}</p></td><td className="px-4 py-3 text-sm text-zinc-300">{e.user}</td><td className="px-4 py-3 text-xs text-zinc-400">{e.services}</td><td className="px-4 py-3 text-xs text-zinc-500">{e.slot}</td><td className="px-4 py-3 text-sm font-bold text-white">AED {e.amount}</td><td className="px-4 py-3"><Badge s={e.status}/></td></tr>);})}
        </tbody></table>
      </div>
    </div>
  );
}

/* ── FINANCIALS ── */
function Financials(){
  const [month,setMonth]=useState("Jun 2026");
  const [drill,setDrill]=useState(null);
  const d=FIN_DATA[month];
  const ytd=MONTHLY_TREND.reduce((a,b)=>a+b.revenue,0);
  const ytdC=MONTHLY_TREND.reduce((a,b)=>a+b.completed,0);
  const mB=bookingsInMonth(month);
  const mDone=mB.filter(b=>b.status==="Project Completed");
  const mCancel=mB.filter(b=>b.status==="Cancelled");
  const mPend=mB.filter(b=>["Shoot Booked","Awaiting Payment"].includes(b.status));

  const fkpis=[
    {icon:DollarSign, label:"Total Revenue",    val:`AED ${d.revenue.toLocaleString()}`, sub:"From completed shoots",  color:"text-emerald-400",bg:"bg-emerald-950/70",bk:mDone, dt:`Revenue — ${month}`},
    {icon:CheckCircle,label:"Completed",         val:d.completed,                         sub:"Projects delivered",      color:"text-blue-400",   bg:"bg-blue-950/70",   bk:mDone, dt:`Completed — ${month}`},
    {icon:XCircle,    label:"Cancelled",          val:d.cancelled,                         sub:"This period",             color:"text-red-400",    bg:"bg-red-950/70",    bk:mCancel,dt:`Cancelled — ${month}`},
    {icon:AlertCircle,label:"Pending",            val:d.pending,                           sub:"Upcoming shoots",         color:"text-amber-400",  bg:"bg-amber-950/70",  bk:mPend, dt:`Pending — ${month}`},
    {icon:TrendingUp, label:"Avg Value",          val:`AED ${d.avgValue.toLocaleString()}`,sub:"Per completed booking",   color:"text-violet-400", bg:"bg-violet-950/70", bk:mDone, dt:`Avg Booking Value — ${month}`},
    {icon:XCircle,    label:"Revenue Lost",        val:d.lostAmount>0?`AED ${d.lostAmount}`:"AED 0",sub:"From cancellations",color:"text-red-500",bg:"bg-red-950/40",   bk:mCancel,dt:`Revenue Lost — ${month}`},
  ];

  return(
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between"><div><p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">Finance</p><h1 className="text-xl font-bold text-white">Financial Overview</h1><p className="text-xs text-zinc-500 mt-0.5">Click any card for a detailed booking breakdown</p></div><div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2.5"><span className="text-xs text-zinc-500">Period:</span><select value={month} onChange={e=>setMonth(e.target.value)} className="bg-transparent text-sm text-white outline-none cursor-pointer font-medium">{Object.keys(FIN_DATA).map(m=><option key={m} value={m} className="bg-zinc-900 text-white">{m}</option>)}</select><ChevronDown size={12} className="text-zinc-600"/></div></div>

      <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl p-6 overflow-hidden"><div className="absolute inset-0 bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-900"/><div className="relative flex items-center justify-between"><div><p className="text-xs text-emerald-500 font-semibold mb-1">Total Revenue Year to Date 2026</p><p className="text-4xl font-bold text-white tracking-tight">AED {ytd.toLocaleString()}</p><p className="text-xs text-zinc-500 mt-2">Across {ytdC} completed bookings &middot; Jan to Jun 2026</p></div><div className="text-right"><div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center mb-2"><TrendingUp size={24} className="text-emerald-400"/></div><p className="text-xs text-emerald-400 font-semibold">up 18% vs last year</p></div></div></div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {fkpis.map((k,i)=>(
          <button key={i} onClick={()=>setDrill(i)} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left hover:border-zinc-600 hover:bg-zinc-800/60 transition-all group">
            <div className="flex items-center justify-between mb-3"><div className={`w-8 h-8 rounded-xl ${k.bg} flex items-center justify-center`}><k.icon size={14} className={k.color}/></div><ArrowUpRight size={11} className="text-zinc-700 group-hover:text-zinc-400 transition-colors"/></div>
            <p className={`text-2xl font-bold ${k.color} tracking-tight`}>{k.val}</p>
            <p className="text-xs text-zinc-400 mt-1 font-medium">{k.label}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{k.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm font-semibold text-white mb-0.5">Weekly Revenue &mdash; {month}</p><p className="text-xs text-zinc-500 mb-4">Revenue by week</p>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={d.weekly} barSize={36} margin={{left:-20,right:4}}><defs><linearGradient id="bg3" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={1}/><stop offset="100%" stopColor="#10b981" stopOpacity={0.5}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false}/><XAxis dataKey="w" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={v=>`AED ${v}`}/><Tooltip contentStyle={TT} labelStyle={LS} itemStyle={IS} cursor={{fill:"rgba(255,255,255,0.04)"}} formatter={v=>[`AED ${v}`,"Revenue"]}/><Bar dataKey="r" name="Revenue" fill="url(#bg3)" radius={[6,6,0,0]}/></BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm font-semibold text-white mb-0.5">Booking Status</p><p className="text-xs text-zinc-500 mb-3">{month}</p>
          <ResponsiveContainer width="100%" height={135}><PieChart><Pie data={d.status} cx="50%" cy="50%" innerRadius={40} outerRadius={62} dataKey="value" paddingAngle={5}>{d.status.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie><Tooltip contentStyle={TT} labelStyle={LS} itemStyle={IS}/></PieChart></ResponsiveContainer>
          <div className="space-y-2.5 mt-3">{d.status.map((item,i)=>(<div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:item.color}}/><span className="text-xs text-zinc-400">{item.name}</span></div><span className="text-sm font-bold text-white">{item.value}</span></div>))}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5"><p className="text-sm font-semibold text-white mb-0.5">6-Month Trend</p><p className="text-xs text-zinc-500 mb-4">Jan to Jun 2026</p><ResponsiveContainer width="100%" height={150}><LineChart data={MONTHLY_TREND} margin={{left:-20,right:4}}><CartesianGrid strokeDasharray="3 3" stroke="#27272a"/><XAxis dataKey="month" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/><Tooltip contentStyle={TT} labelStyle={LS} itemStyle={IS} cursor={{fill:"rgba(255,255,255,0.04)"}} formatter={v=>[`AED ${v}`,"Revenue"]}/><Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{fill:"#10b981",r:4,strokeWidth:0}} activeDot={{r:6}}/></LineChart></ResponsiveContainer></div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5"><p className="text-sm font-semibold text-white mb-0.5">Revenue by Service</p><p className="text-xs text-zinc-500 mb-3">{month}</p><div className="relative"><ResponsiveContainer width="100%" height={115}><PieChart><Pie data={d.services} cx="50%" cy="50%" innerRadius={30} outerRadius={52} dataKey="value" paddingAngle={3}>{d.services.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}</Pie><Tooltip contentStyle={TT} labelStyle={LS} itemStyle={IS} formatter={v=>[`AED ${v}`,""]} /></PieChart></ResponsiveContainer><div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="text-center"><p className="text-xs font-bold text-white">AED {d.services.reduce((a,b)=>a+b.value,0).toLocaleString()}</p><p className="text-[9px] text-zinc-500">total</p></div></div></div><div className="space-y-2 mt-3">{d.services.map((item,i)=>(<div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor:PAL[i]}}/><span className="text-xs text-zinc-400">{item.name}</span></div><span className="text-xs font-bold text-white">AED {item.value}</span></div>))}</div></div>
      </div>

      {drill!==null&&fkpis[drill]&&<DrillModal title={fkpis[drill].dt} subtitle={`Detailed breakdown for ${month}`} bookings={fkpis[drill].bk} onClose={()=>setDrill(null)}/>}
    </div>
  );
}

/* ── REPORTS ── */
function ReportsPage(){
  const [month,setMonth]=useState("Jun 2026");
  const [fDrill,setFDrill]=useState(null);
  const [expenses,setExpenses]=useState(INIT_EXPENSES);
  const [showForm,setShowForm]=useState(false);
  const [editExp,setEditExp]=useState(null);
  const [expMonth,setExpMonth]=useState("Jun 2026");
  const [aRow,setARow]=useState(null);
  const [catSelModal,setCatSelModal]=useState(null);

  const d=FIN_DATA[month];
  const ytd=MONTHLY_TREND.reduce((a,b)=>a+b.revenue,0);
  const ytdC=MONTHLY_TREND.reduce((a,b)=>a+b.completed,0);
  const mB=bookingsInMonth(month);
  const mDone=mB.filter(b=>b.status==="Project Completed");
  const mCancel=mB.filter(b=>b.status==="Cancelled");
  const mPend=mB.filter(b=>["Shoot Booked","Awaiting Payment"].includes(b.status));

  const expOf=(mStr)=>expenses.filter(e=>e.month===mStr).reduce((a,b)=>a+b.amount,0);
  const netPro=(r)=>r.revenue-expOf(r.m);
  const ytdExp=expenses.reduce((a,b)=>a+b.amount,0);
  const ytdNet=REPORTS_DATA.reduce((a,b)=>a+netPro(b),0);
  const filtExps=expenses.filter(e=>e.month===expMonth).sort((a,b)=>b.date.localeCompare(a.date));
  const filtTotal=filtExps.reduce((a,b)=>a+b.amount,0);
  const catBreak={};filtExps.forEach(e=>{catBreak[e.cat]=(catBreak[e.cat]||0)+e.amount;});
  const catData=Object.entries(catBreak).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  const bestM=REPORTS_DATA.reduce((a,b)=>b.revenue>a.revenue?b:a);

  const fkpis=[
    {icon:DollarSign, label:"Revenue",      val:fmtK(d.revenue),    sub:"Completed shoots",  color:"text-emerald-400",bg:"bg-emerald-950/70",bk:mDone,  dt:`Revenue \u2014 ${month}`},
    {icon:CheckCircle,label:"Completed",    val:d.completed,         sub:"Projects delivered",color:"text-blue-400",   bg:"bg-blue-950/70",   bk:mDone,  dt:`Completed \u2014 ${month}`},
    {icon:XCircle,    label:"Cancelled",    val:d.cancelled,         sub:"This period",       color:"text-red-400",    bg:"bg-red-950/70",    bk:mCancel,dt:`Cancelled \u2014 ${month}`},
    {icon:AlertCircle,label:"Pending",      val:d.pending,           sub:"Upcoming shoots",   color:"text-amber-400",  bg:"bg-amber-950/70",  bk:mPend,  dt:`Pending \u2014 ${month}`},
    {icon:TrendingUp, label:"Avg Value",    val:fmtK(d.avgValue),   sub:"Per booking",       color:"text-violet-400", bg:"bg-violet-950/70", bk:mDone,  dt:`Avg Value \u2014 ${month}`},
    {icon:Receipt,    label:"Expenses MTD", val:fmtK(expOf(month)), sub:"Total outgoings",   color:"text-red-400",    bg:"bg-red-950/70",    bk:[],     dt:null},
  ];
  const saveExp=(form)=>{if(editExp){setExpenses(p=>p.map(e=>e.id===editExp.id?{...e,...form}:e));setEditExp(null);}else{setExpenses(p=>[...p,{id:Date.now(),...form}]);}setShowForm(false);};
  const delExp=(id)=>setExpenses(p=>p.filter(e=>e.id!==id));

  return(
    <div className="p-6 space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">Finance</p>
          <h1 className="text-xl font-bold text-white">Financial Reports</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Revenue analytics, P&L breakdown and expense tracking &middot; click any KPI card for details</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
            <span className="text-xs text-zinc-500">Month:</span>
            <select value={month} onChange={e=>setMonth(e.target.value)} className="bg-transparent text-sm text-white outline-none cursor-pointer font-medium">
              {Object.keys(FIN_DATA).map(m=><option key={m} value={m} className="bg-zinc-900 text-white">{m}</option>)}
            </select>
          </div>
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"><FileDown size={13}/> CSV</button>
          <button className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-zinc-800 transition-colors"><FileSpreadsheet size={13}/> Excel</button>
          <button className="flex items-center gap-2 bg-white text-black text-xs font-bold px-3 py-2 rounded-lg hover:bg-zinc-100 transition-colors"><Download size={13}/> PDF Report</button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 border-l-4 border-l-emerald-600">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          <div><p className="text-xs text-emerald-500 font-semibold mb-1">Total Revenue YTD</p><p className="text-2xl font-bold text-white">{fmtK(ytd)}</p><p className="text-xs text-zinc-500 mt-0.5">{ytdC} completed shoots</p></div>
          <div><p className="text-xs text-red-400 font-semibold mb-1">Total Expenses YTD</p><p className="text-2xl font-bold text-white">{fmtK(ytdExp)}</p><p className="text-xs text-zinc-500 mt-0.5">{expenses.length} entries logged</p></div>
          <div><p className="text-xs text-blue-400 font-semibold mb-1">Net Profit YTD</p><p className="text-2xl font-bold text-white">{fmtK(ytdNet)}</p><p className="text-xs text-zinc-500 mt-0.5">{ytd>0?Math.round((ytdNet/ytd)*100):0}% profit margin</p></div>
          <div><p className="text-xs text-amber-400 font-semibold mb-1">Best Month</p><p className="text-2xl font-bold text-white">{bestM.m.split(" ")[0]}</p><p className="text-xs text-zinc-500 mt-0.5">{fmtK(bestM.revenue)} revenue</p></div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {fkpis.map((k,i)=>(
          <button key={i} onClick={()=>k.dt&&setFDrill(i)}
            className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-left transition-all ${k.dt?"hover:border-zinc-600 hover:bg-zinc-800/60 group cursor-pointer":"cursor-default"}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-xl ${k.bg} flex items-center justify-center`}><k.icon size={14} className={k.color}/></div>
              {k.dt&&<ArrowUpRight size={11} className="text-zinc-700 group-hover:text-zinc-400 transition-colors"/>}
            </div>
            <p className={`text-2xl font-bold ${k.color} tracking-tight`}>{k.val}</p>
            <p className="text-xs text-zinc-400 mt-1 font-medium">{k.label}</p>
            <p className="text-[10px] text-zinc-600 mt-0.5">{k.sub}</p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm font-semibold text-white mb-0.5">Weekly Revenue &mdash; {month}</p>
          <p className="text-xs text-zinc-500 mb-4">Revenue breakdown by week</p>
          <ResponsiveContainer width="100%" height={165}>
            <BarChart data={d.weekly} barSize={36} margin={{left:-20,right:4}}>
              <defs><linearGradient id="bg5" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10b981" stopOpacity={1}/><stop offset="100%" stopColor="#10b981" stopOpacity={0.5}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false}/>
              <XAxis dataKey="w" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={(v)=>fmtK(v)}/>
              <Tooltip contentStyle={TT} labelStyle={LS} itemStyle={IS} cursor={{fill:"rgba(255,255,255,0.04)"}} formatter={(v)=>[fmtK(v),"Revenue"]}/>
              <Bar dataKey="r" name="Revenue" fill="url(#bg5)" radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm font-semibold text-white mb-0.5">Booking Status</p>
          <p className="text-xs text-zinc-500 mb-3">{month}</p>
          <div className="relative">
            <ResponsiveContainer width="100%" height={130}>
              <PieChart>
                <Pie data={d.status} cx="50%" cy="50%" innerRadius={38} outerRadius={58} dataKey="value" paddingAngle={5}>{d.status.map((e,i)=><Cell key={i} fill={e.color}/>)}</Pie>
                <Tooltip contentStyle={TT} labelStyle={LS} itemStyle={IS}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="text-center"><p className="text-sm font-bold text-white">{d.status.reduce((a,b)=>a+b.value,0)}</p><p className="text-[10px] text-zinc-500">total</p></div></div>
          </div>
          <div className="space-y-2 mt-3">{d.status.map((item,i)=>(<div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:item.color}}/><span className="text-xs text-zinc-400">{item.name}</span></div><span className="text-sm font-bold text-white">{item.value}</span></div>))}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm font-semibold text-white mb-0.5">6-Month Revenue Trend</p>
          <p className="text-xs text-zinc-500 mb-4">Jan to Jun 2026</p>
          <ResponsiveContainer width="100%" height={145}>
            <LineChart data={MONTHLY_TREND} margin={{left:-20,right:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a"/>
              <XAxis dataKey="month" tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:"#71717a",fontSize:11}} axisLine={false} tickLine={false} tickFormatter={(v)=>fmtK(v)}/>
              <Tooltip contentStyle={TT} labelStyle={LS} itemStyle={IS} formatter={(v)=>[fmtK(v),"Revenue"]}/>
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{fill:"#10b981",r:4,strokeWidth:0}} activeDot={{r:6}}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <p className="text-sm font-semibold text-white mb-0.5">Revenue by Service</p>
          <p className="text-xs text-zinc-500 mb-3">{month}</p>
          <div className="relative">
            <ResponsiveContainer width="100%" height={165}>
              <PieChart>
                <Pie data={d.services} cx="50%" cy="50%" innerRadius={52} outerRadius={78} dataKey="value" paddingAngle={4}>{d.services.map((_,i)=><Cell key={i} fill={PAL[i%PAL.length]}/>)}</Pie>
                <Tooltip contentStyle={TT} labelStyle={LS} itemStyle={IS} formatter={(v)=>[fmtK(v),""]}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"><div className="text-center"><p className="text-sm font-bold text-white">{fmtK(d.services.reduce((a,b)=>a+b.value,0))}</p><p className="text-[10px] text-zinc-500 mt-0.5">total</p></div></div>
          </div>
          <div className="space-y-1.5 mt-3">{d.services.map((item,i)=>(<div key={i} className="flex items-center justify-between"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor:PAL[i]}}/><span className="text-xs text-zinc-400">{item.name}</span></div><span className="text-xs font-bold text-white">{fmtK(item.value)}</span></div>))}</div>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div><p className="text-sm font-semibold text-white">Monthly Comparison</p><p className="text-xs text-zinc-500 mt-0.5">Click a row to load that month above</p></div>
          <span className="text-xs text-zinc-500 hidden lg:block">YTD: <span className="text-emerald-400 font-bold">{fmtK(ytd)}</span></span>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800"><TH ch="Month"/><TH ch="Revenue"/><TH ch="Completed"/><TH ch="Cancelled"/><TH ch="Pending"/><TH ch="Avg Value"/><TH ch="Lost"/></tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {Object.entries(FIN_DATA).map(([m,md])=>(
              <tr key={m} onClick={()=>setMonth(m)} className={`hover:bg-zinc-800/50 cursor-pointer transition-colors ${m===month?"bg-zinc-800/40":""}`}>
                <td className="px-4 py-3.5 text-sm font-semibold text-white">{m}{m===month&&<span className="ml-2 text-[9px] bg-blue-950 text-blue-400 border border-blue-800 px-1.5 py-0.5 rounded-full font-bold">Viewing</span>}</td>
                <td className="px-4 py-3.5 text-sm font-bold text-emerald-400">{fmtK(md.revenue)}</td>
                <td className="px-4 py-3.5 text-sm font-semibold text-white">{md.completed}</td>
                <td className="px-4 py-3.5 text-sm font-semibold text-red-400">{md.cancelled}</td>
                <td className="px-4 py-3.5 text-sm font-semibold text-amber-400">{md.pending}</td>
                <td className="px-4 py-3.5 text-sm text-white">{fmtK(md.avgValue)}</td>
                <td className="px-4 py-3.5 text-sm font-semibold">{md.lostAmount>0?<span className="text-red-400">{fmtK(md.lostAmount)}</span>:<span className="text-zinc-600">-</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800"><p className="text-sm font-semibold text-white">Full P&L Breakdown</p><p className="text-xs text-zinc-500 mt-0.5">Jan to Jun 2026 &middot; Net = Revenue minus actual expenses. Click row to highlight.</p></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800"><TH ch="Month"/><TH ch="Revenue"/><TH ch="Expenses"/><TH ch="Net Profit"/><TH ch="Margin"/><TH ch="Shoots"/><TH ch="Avg Value"/><TH ch="Lost"/><TH ch="Outstanding"/></tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {REPORTS_DATA.map((r,i)=>{const exp=expOf(r.m);const np=netPro(r);const mg=r.revenue>0?Math.round((np/r.revenue)*100):0;return(
                <tr key={i} onClick={()=>setARow(aRow===i?null:i)} className={`cursor-pointer transition-colors ${aRow===i?"bg-zinc-800/60":"hover:bg-zinc-800/40"}`}>
                  <td className="px-4 py-3.5"><span className="text-sm font-bold text-white">{r.m}</span>{i===0&&<span className="ml-2 text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded-full font-bold">Current</span>}</td>
                  <td className="px-4 py-3.5 text-sm font-bold text-emerald-400">{fmtK(r.revenue)}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-red-400">{fmtK(exp)}</td>
                  <td className="px-4 py-3.5 text-sm font-bold text-blue-400">{fmtK(np)}</td>
                  <td className="px-4 py-3.5"><span className={`text-xs font-bold px-2 py-0.5 rounded-full ${mg>=50?"bg-emerald-950 text-emerald-400 border border-emerald-800":mg>=30?"bg-amber-950 text-amber-400 border border-amber-800":"bg-red-950 text-red-400 border border-red-800"}`}>{mg}%</span></td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-white">{r.completed}</td>
                  <td className="px-4 py-3.5 text-sm text-zinc-300">{fmtK(r.avg)}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold">{r.lost>0?<span className="text-red-400">{fmtK(r.lost)}</span>:<span className="text-zinc-600">-</span>}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold">{r.outstanding>0?<span className="text-amber-400">{fmtK(r.outstanding)}</span>:<span className="text-zinc-600">-</span>}</td>
                </tr>
              );})}
            </tbody>
            <tfoot><tr className="border-t-2 border-zinc-700 bg-zinc-800/50">
              <td className="px-4 py-3.5 text-xs font-black text-white uppercase tracking-wide">Total YTD</td>
              <td className="px-4 py-3.5 text-sm font-black text-emerald-400">{fmtK(ytd)}</td>
              <td className="px-4 py-3.5 text-sm font-black text-red-400">{fmtK(ytdExp)}</td>
              <td className="px-4 py-3.5 text-sm font-black text-blue-400">{fmtK(ytdNet)}</td>
              <td className="px-4 py-3.5"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800">{ytd>0?Math.round((ytdNet/ytd)*100):0}%</span></td>
              <td className="px-4 py-3.5 text-sm font-black text-white">{ytdC}</td>
              <td className="px-4 py-3.5 text-sm text-zinc-400">{ytdC>0?fmtK(Math.round(ytd/ytdC)):"-"}</td>
              <td className="px-4 py-3.5 text-sm font-black text-red-400">{fmtK(REPORTS_DATA.reduce((a,b)=>a+b.lost,0))}</td>
              <td className="px-4 py-3.5 text-sm font-black text-amber-400">{fmtK(REPORTS_DATA.reduce((a,b)=>a+b.outstanding,0))}</td>
            </tr></tfoot>
          </table>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-xl bg-red-950 flex items-center justify-center"><Receipt size={14} className="text-red-400"/></div><div><p className="text-sm font-semibold text-white">Expense Tracker</p><p className="text-xs text-zinc-500 mt-0.5">Log and categorise all business expenses</p></div></div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5"><span className="text-xs text-zinc-500">Month:</span><select value={expMonth} onChange={e=>setExpMonth(e.target.value)} className="bg-transparent text-xs text-white outline-none cursor-pointer font-medium">{["Jun 2026","May 2026","Apr 2026","Mar 2026","Feb 2026","Jan 2026"].map(m=><option key={m} value={m} className="bg-zinc-900 text-white">{m}</option>)}</select></div>
            <button onClick={()=>{setEditExp(null);setShowForm(true);}} className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors"><Plus size={13}/> Add Expense</button>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-px border-b border-zinc-800">
          {[{label:"Total Expenses",val:fmtK(filtTotal),color:"text-red-400"},{label:"Count",val:filtExps.length,color:"text-white"},{label:"Top Category",val:catData[0]?.name||"—",color:"text-amber-400"}].map((s,i)=>(<div key={i} className="bg-zinc-800/40 px-5 py-3.5 text-center"><p className={`text-lg font-bold ${s.color}`}>{s.val}</p><p className="text-xs text-zinc-500 mt-0.5">{s.label}</p></div>))}
        </div>
        {catData.length>0&&(<div className="px-5 py-4 border-b border-zinc-800"><p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Breakdown by Category &mdash; {expMonth}</p><div className="space-y-2">{catData.map((cat,i)=>{const pct=filtTotal>0?Math.round((cat.value/filtTotal)*100):0;return(<button key={i} onClick={()=>setCatSelModal(cat.name)} className="w-full text-left group"><div className="flex items-center justify-between mb-1"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{backgroundColor:PAL[i%PAL.length]}}/><span className="text-xs text-zinc-300 group-hover:text-white transition-colors">{cat.name}</span></div><div className="flex items-center gap-1.5"><span className="text-xs font-semibold text-white">{fmtK(cat.value)} <span className="text-zinc-500 font-normal">({pct}%)</span></span><ArrowUpRight size={10} className="text-zinc-700 group-hover:text-zinc-400 transition-colors"/></div></div><div className="w-full bg-zinc-800 rounded-full h-1.5"><div className="h-1.5 rounded-full" style={{width:`${pct}%`,backgroundColor:PAL[i%PAL.length]}}/></div></button>);})}</div></div>)}
        {filtExps.length===0?(<div className="py-12 text-center"><div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-3"><Wallet size={20} className="text-zinc-600"/></div><p className="text-sm text-zinc-400 font-medium">No expenses for {expMonth}</p><p className="text-xs text-zinc-600 mt-1">Click "Add Expense" to log your first entry</p></div>):(
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800"><TH ch="Date"/><TH ch="Category"/><TH ch="Description"/><TH ch="Amount"/><TH ch="Actions"/></tr></thead>
            <tbody className="divide-y divide-zinc-800">
              {filtExps.map(exp=>(<tr key={exp.id} className="hover:bg-zinc-800/40 transition-colors group"><td className="px-4 py-3 text-sm text-zinc-400 whitespace-nowrap">{new Date(exp.date).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}</td><td className="px-4 py-3"><span className="text-xs font-semibold px-2 py-0.5 rounded-full border" style={{backgroundColor:`${PAL[EXP_CATS.indexOf(exp.cat)%PAL.length]}20`,color:PAL[EXP_CATS.indexOf(exp.cat)%PAL.length],borderColor:`${PAL[EXP_CATS.indexOf(exp.cat)%PAL.length]}40`}}>{exp.cat}</span></td><td className="px-4 py-3 text-sm text-zinc-300 max-w-xs"><span className="truncate block">{exp.desc||"—"}</span></td><td className="px-4 py-3 text-sm font-bold text-red-400">{fmtK(exp.amount)}</td><td className="px-4 py-3"><div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={()=>{setEditExp(exp);setShowForm(true);}} className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"><Pencil size={11}/> Edit</button><button onClick={()=>delExp(exp.id)} className="text-xs text-red-400 hover:text-red-300 font-medium flex items-center gap-1 transition-colors"><Trash2 size={11}/> Delete</button></div></td></tr>))}
            </tbody>
            <tfoot><tr className="border-t border-zinc-700 bg-zinc-800/50"><td colSpan={3} className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wide">Total for {expMonth}</td><td className="px-4 py-3 text-sm font-black text-red-400">{fmtK(filtTotal)}</td><td/></tr></tfoot>
          </table>
        )}
      </div>

      {fDrill!==null&&fkpis[fDrill]?.dt&&<DrillModal title={fkpis[fDrill].dt} subtitle={`Detailed breakdown for ${month}`} bookings={fkpis[fDrill].bk} onClose={()=>setFDrill(null)}/>}
      {showForm&&<ExpenseFormModal initial={editExp} onSave={saveExp} onClose={()=>{setShowForm(false);setEditExp(null);}}/>}
      {catSelModal&&(
        <ExpenseCatModal
          expenses={filtExps.filter(e=>e.cat===catSelModal)}
          catName={catSelModal}
          onClose={()=>setCatSelModal(null)}
        />
      )}
    </div>
  );
}

/* ── SUPPORT PAGES ── */
function UsersPage(){
  const [sort,setSort]=useState({key:"name",dir:"asc"});
  const toggle=(k)=>setSort(s=>({key:k,dir:s.key===k&&s.dir==="asc"?"desc":"asc"}));
  const SortHd=({k,label})=>(
    <th className="text-left px-4 py-3 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest cursor-pointer hover:text-zinc-300 transition-colors whitespace-nowrap select-none" onClick={()=>toggle(k)}>
      {label} <span className={sort.key===k?"text-emerald-400":"text-zinc-700"}>{sort.key===k?(sort.dir==="asc"?"↑":"↓"):"↕"}</span>
    </th>
  );
  const sorted=[...USERS].sort((a,b)=>{
    const mul=sort.dir==="asc"?1:-1;
    if(sort.key==="name")    return mul*a.name.localeCompare(b.name);
    if(sort.key==="bookings")return mul*(a.count-(b.count));
    if(sort.key==="spent")   return mul*((a.spent||0)-(b.spent||0));
    return 0;
  });
  const totalSpent=USERS.filter(u=>u.role!=="SUPERADMIN").reduce((a,b)=>a+(b.spent||0),0);
  return(
    <div className="p-6">
      <PH label="Workspace" title="User Management" sub="Sort by name, bookings, or total spent — click column headers" action={<button className="flex items-center gap-2 bg-white text-black text-xs font-bold px-3.5 py-2 rounded-lg"><Plus size={13}/> New User</button>}/>
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          {label:"Total Customers", val:USERS.filter(u=>u.role!=="SUPERADMIN").length, color:"text-white"},
          {label:"Total Bookings",  val:USERS.reduce((a,b)=>a+b.count,0),              color:"text-blue-400"},
          {label:"Total Revenue",   val:`AED ${totalSpent.toLocaleString()}`,           color:"text-emerald-400"},
        ].map((s,i)=>(
          <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
            <p className="text-xs text-zinc-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-800">
              <TH ch="ID"/>
              <SortHd k="name"     label="Name"/>
              <TH ch="Phone"/>
              <TH ch="Role"/>
              <SortHd k="bookings" label="Bookings"/>
              <SortHd k="spent"    label="Total Spent"/>
              <TH ch="Actions"/>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {sorted.map(u=>(
              <tr key={u.id} className="hover:bg-zinc-800/40 transition-colors">
                <td className="px-4 py-3.5 text-xs text-zinc-600 font-mono">#{u.id}</td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 font-bold flex-shrink-0">{u.name.slice(0,2).toUpperCase()}</div>
                    <div>
                      <p className="text-sm text-white font-medium">{u.name}</p>
                      <p className="text-xs text-zinc-500">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm text-zinc-400">{u.phone}</td>
                <td className="px-4 py-3.5"><span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${u.role==="SUPERADMIN"?"bg-red-950 text-red-400 border-red-800":"bg-zinc-800 text-zinc-300 border-zinc-700"}`}>{u.role}</span></td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-white">{u.count}</span>

                  </div>
                </td>
                <td className="px-4 py-3.5 text-sm font-bold text-emerald-400">{u.spent>0?`AED ${u.spent.toLocaleString()}`:<span className="text-zinc-600">—</span>}</td>
                <td className="px-4 py-3.5"><div className="flex gap-3"><button className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">Edit</button>{u.role!=="SUPERADMIN"&&<button className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">Delete</button>}</div></td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-zinc-700 bg-zinc-800/50">
              <td colSpan={4} className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wide">Totals</td>
              <td className="px-4 py-3 text-sm font-black text-white">{USERS.reduce((a,b)=>a+b.count,0)}</td>
              <td className="px-4 py-3 text-sm font-black text-emerald-400">AED {totalSpent.toLocaleString()}</td>
              <td/>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
function InvoicesPage(){
  const [q,setQ]=useState("");
  const hits=INVOICES.filter(inv=>
    inv.id.toLowerCase().includes(q.toLowerCase())||
    inv.ref.toLowerCase().includes(q.toLowerCase())||
    inv.user.toLowerCase().includes(q.toLowerCase())
  );
  return(
    <div className="p-6">
      <PH label="Finance" title="Invoices" sub="Search and download all issued invoices"/>
      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"/>
        <input type="text" placeholder="Search by invoice ID, booking ref or customer name..."
          value={q} onChange={e=>setQ(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-600 transition-colors"/>
        {q&&<button onClick={()=>setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"><X size={13}/></button>}
      </div>
      {q&&<p className="text-xs text-zinc-500 mb-3">{hits.length} result{hits.length!==1?"s":""} for &ldquo;{q}&rdquo;</p>}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800"><TH ch="Invoice ID"/><TH ch="Booking Ref"/><TH ch="Customer"/><TH ch="Date"/><TH ch="Amount"/><TH ch="Status"/><TH ch="Action"/></tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {hits.length===0?(<tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-zinc-600">{q?"No invoices match your search":"No invoices yet"}</td></tr>):(
              hits.map(inv=>(
                <tr key={inv.id} className="hover:bg-zinc-800/40 transition-colors">
                  <td className="px-4 py-3.5 text-xs text-zinc-300 font-mono">{inv.id}</td>
                  <td className="px-4 py-3.5 text-sm font-semibold text-zinc-400">{inv.ref}</td>
                  <td className="px-4 py-3.5"><p className="text-sm text-white font-medium">{inv.user}</p><p className="text-xs text-zinc-500">{inv.email}</p></td>
                  <td className="px-4 py-3.5 text-sm text-zinc-400">{inv.date}</td>
                  <td className="px-4 py-3.5 text-sm font-bold text-white">AED {inv.amount.toLocaleString()}</td>
                  <td className="px-4 py-3.5"><Badge s="success"/></td>
                  <td className="px-4 py-3.5"><button className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white font-medium transition-colors"><Download size={12}/> PDF</button></td>
                </tr>
              ))
            )}
          </tbody>
          {hits.length>0&&(
            <tfoot><tr className="border-t border-zinc-700 bg-zinc-800/50">
              <td colSpan={4} className="px-4 py-3 text-xs font-bold text-zinc-400 uppercase tracking-wide">Total ({hits.length} invoices)</td>
              <td className="px-4 py-3 text-sm font-black text-white">AED {hits.reduce((a,b)=>a+b.amount,0).toLocaleString()}</td>
              <td colSpan={2}/>
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
function DiscountsPage(){return(<div className="p-6"><PH label="Operations" title="Discount Configuration" sub="Manage automatic discounts and wallet credits" action={<button className="flex items-center gap-2 bg-blue-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg"><Plus size={13}/> Add Discount</button>}/><div className="bg-zinc-900 border border-zinc-800 rounded-xl"><div className="grid grid-cols-6 px-5 py-3 border-b border-zinc-800">{["Order","Name","Type","Rules","Status","Actions"].map(h=><span key={h} className="text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">{h}</span>)}</div><div className="py-16 text-center"><div className="w-12 h-12 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-3"><Percent size={20} className="text-zinc-600"/></div><p className="text-sm text-zinc-400 font-medium">No discounts configured</p></div></div></div>);}
function CouponsPage(){
  const [tab,setTab]=useState("generic");
  const [showForm,setShowForm]=useState(false);
  const [form,setForm]=useState({discType:"fixed",status:"Active"});
  const upd=(k,v)=>setForm(f=>({...f,[k]:v}));
  const openForm=()=>{setForm({discType:"fixed",status:"Active"});setShowForm(true);};

  const [generics,setGenerics]=useState([
    {id:1,code:"LAUNCH500",discType:"fixed",discVal:500,cap:500,minSpend:449,perUser:1,total:null,uses:0,status:"Active",desc:"Launch offer credit"},
  ]);
  const [personals,setPersonals]=useState([]);
  const [autos,setAutos]=useState([
    {id:1,name:"First Booking Offer",trigger:"First booking",discType:"fixed",discVal:500,cap:500,status:"Active"},
  ]);

  const saveGeneric=()=>{setGenerics(p=>[...p,{id:Date.now(),...form,uses:0}]);setShowForm(false);};
  const savePersonal=()=>{setPersonals(p=>[...p,{id:Date.now(),...form}]);setShowForm(false);};
  const saveAuto=()=>{setAutos(p=>[...p,{id:Date.now(),...form}]);setShowForm(false);};
  const delG=(id)=>setGenerics(p=>p.filter(x=>x.id!==id));
  const delP=(id)=>setPersonals(p=>p.filter(x=>x.id!==id));
  const delA=(id)=>setAutos(p=>p.filter(x=>x.id!==id));
  const togG=(id)=>setGenerics(p=>p.map(x=>x.id===id?{...x,status:x.status==="Active"?"Inactive":"Active"}:x));
  const togA=(id)=>setAutos(p=>p.map(x=>x.id===id?{...x,status:x.status==="Active"?"Inactive":"Active"}:x));

  const discFmt=(it)=>it.discType==="pct"?`${it.discVal}% off (max AED ${it.cap||"—"})`:it.discVal?`AED ${it.discVal} credit`:"—";
  const TRIGGERS=["First booking","Second booking","Date range: Ramadan","Date range: Summer","Any booking"];
  const TABS=[
    {id:"generic",label:"Generic Codes",count:generics.length,color:"bg-blue-600 hover:bg-blue-500"},
    {id:"personal",label:"Personal (Auto-Apply)",count:personals.length,color:"bg-violet-600 hover:bg-violet-500"},
    {id:"auto",label:"Auto Discounts",count:autos.length,color:"bg-amber-600 hover:bg-amber-500"},
  ];
  const inputCx="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-500 transition-colors";
  const selCx="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-zinc-500 transition-colors";
  const labelCx="text-xs text-zinc-500 block mb-1.5 font-medium";

  return(
    <div className="p-6">
      <PH label="Operations" title="Coupon Management" sub="Generic codes, personal auto-apply, and automatic rule-based discounts"/>
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map(t=>(<button key={t.id} onClick={()=>{setTab(t.id);setShowForm(false);}}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab===t.id?"bg-white text-black":"bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"}`}>
          {t.label} <span className="opacity-50">({t.count})</span>
        </button>))}
      </div>

      {tab==="generic"&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-500">Code-based coupons any customer can redeem at checkout.</p>
            <button onClick={openForm} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors"><Plus size={13}/> Create Code</button>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-zinc-800"><TH ch="Code"/><TH ch="Discount"/><TH ch="Min Spend"/><TH ch="Per User"/><TH ch="Uses"/><TH ch="Status"/><TH ch="Actions"/></tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {generics.map(g=>(
                  <tr key={g.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3.5"><div className="flex items-center gap-2"><Tag size={12} className="text-zinc-500"/><span className="text-sm font-bold text-white font-mono">{g.code}</span></div>{g.desc&&<p className="text-xs text-zinc-600 mt-0.5 ml-5">{g.desc}</p>}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-white">{discFmt(g)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{g.minSpend?`AED ${g.minSpend}`:"—"}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{g.perUser||1}x</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{g.uses}/{g.total||"∞"}</td>
                    <td className="px-4 py-3.5"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${g.status==="Active"?"bg-emerald-950 text-emerald-400 border-emerald-800":"bg-zinc-800 text-zinc-500 border-zinc-700"}`}>{g.status}</span></td>
                    <td className="px-4 py-3.5"><div className="flex items-center gap-3"><button onClick={()=>togG(g.id)} className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">{g.status==="Active"?"Pause":"Activate"}</button><button onClick={()=>delG(g.id)} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">Delete</button></div></td>
                  </tr>
                ))}
                {generics.length===0&&<tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-zinc-600">No generic coupons yet</td></tr>}
              </tbody>
            </table>
          </div>
          {showForm&&(
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
              <p className="text-sm font-bold text-white">Create Generic Coupon Code</p>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCx}>Coupon Code <span className="text-red-400">*</span></label><input type="text" placeholder="e.g. SUMMER20" value={form.code||""} onChange={e=>upd("code",e.target.value.toUpperCase())} className={inputCx+" font-mono"}/></div>
                <div><label className={labelCx}>Description</label><input type="text" placeholder="Internal note" value={form.desc||""} onChange={e=>upd("desc",e.target.value)} className={inputCx}/></div>
                <div><label className={labelCx}>Discount Type</label><select value={form.discType||"fixed"} onChange={e=>upd("discType",e.target.value)} className={selCx}><option value="fixed" className="bg-zinc-900">Fixed Amount (AED)</option><option value="pct" className="bg-zinc-900">Percentage (%)</option></select></div>
                <div><label className={labelCx}>Discount Value <span className="text-red-400">*</span></label><input type="number" placeholder={form.discType==="pct"?"e.g. 15":"e.g. 500"} value={form.discVal||""} onChange={e=>upd("discVal",parseFloat(e.target.value))} className={inputCx}/></div>
                {form.discType==="pct"&&<div><label className={labelCx}>Max Cap (AED)</label><input type="number" placeholder="e.g. 300" value={form.cap||""} onChange={e=>upd("cap",parseFloat(e.target.value))} className={inputCx}/></div>}
                <div><label className={labelCx}>Min Spend (AED)</label><input type="number" placeholder="e.g. 449" value={form.minSpend||""} onChange={e=>upd("minSpend",parseFloat(e.target.value))} className={inputCx}/></div>
                <div><label className={labelCx}>Uses per User</label><input type="number" placeholder="1" value={form.perUser||""} onChange={e=>upd("perUser",parseInt(e.target.value))} className={inputCx}/></div>
                <div><label className={labelCx}>Total Usage Limit</label><input type="number" placeholder="Blank = unlimited" value={form.total||""} onChange={e=>upd("total",parseInt(e.target.value)||null)} className={inputCx}/></div>
              </div>
              <div className="flex gap-2 pt-1"><button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 font-medium transition-colors">Cancel</button><button onClick={saveGeneric} disabled={!form.code||!form.discVal} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${form.code&&form.discVal?"bg-blue-600 hover:bg-blue-500 text-white":"bg-zinc-700 text-zinc-500 cursor-not-allowed"}`}>Create Coupon</button></div>
            </div>
          )}
        </div>
      )}

      {tab==="personal"&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="bg-violet-950/40 border border-violet-900 rounded-xl px-4 py-3 flex-1 mr-4"><p className="text-xs font-semibold text-violet-400 mb-0.5">Partner / VIP Auto-Codes</p><p className="text-xs text-zinc-500">Assigned to a specific customer. Auto-applied at checkout — no code entry needed. Ideal for agency partners and VIP clients.</p></div>
            <button onClick={openForm} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors flex-shrink-0"><Plus size={13}/> Create Personal Code</button>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-zinc-800"><TH ch="Customer"/><TH ch="Discount"/><TH ch="Label"/><TH ch="Type"/><TH ch="Status"/><TH ch="Actions"/></tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {personals.map(p=>(
                  <tr key={p.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3.5"><p className="text-sm text-white font-medium">{p.userName||"—"}</p><p className="text-xs text-zinc-500">{p.userEmail||""}</p></td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-white">{discFmt(p)}</td>
                    <td className="px-4 py-3.5 text-sm text-zinc-400">{p.label||"—"}</td>
                    <td className="px-4 py-3.5"><span className="text-xs bg-violet-950 text-violet-400 border border-violet-800 px-2 py-0.5 rounded-full font-bold">Auto-Applied</span></td>
                    <td className="px-4 py-3.5"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-950 text-emerald-400 border-emerald-800">{p.status||"Active"}</span></td>
                    <td className="px-4 py-3.5"><button onClick={()=>delP(p.id)} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">Delete</button></td>
                  </tr>
                ))}
                {personals.length===0&&<tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-zinc-600">No personal codes yet. Create one to auto-apply a discount for a specific customer.</td></tr>}
              </tbody>
            </table>
          </div>
          {showForm&&(
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
              <p className="text-sm font-bold text-white">Create Personal Auto-Code</p>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCx}>Select Customer <span className="text-red-400">*</span></label><select value={form.userId||""} onChange={e=>{const u=USERS.find(u=>u.id===parseInt(e.target.value));upd("userId",parseInt(e.target.value));upd("userName",u?.name||"");upd("userEmail",u?.email||"");}} className={selCx}><option value="" className="bg-zinc-900">Select customer...</option>{USERS.filter(u=>u.role!=="SUPERADMIN").map(u=><option key={u.id} value={u.id} className="bg-zinc-900">{u.name}</option>)}</select></div>
                <div><label className={labelCx}>Internal Label</label><input type="text" placeholder="e.g. Partner Rate Q2" value={form.label||""} onChange={e=>upd("label",e.target.value)} className={inputCx}/></div>
                <div><label className={labelCx}>Discount Type</label><select value={form.discType||"fixed"} onChange={e=>upd("discType",e.target.value)} className={selCx}><option value="fixed" className="bg-zinc-900">Fixed Amount (AED)</option><option value="pct" className="bg-zinc-900">Percentage (%)</option></select></div>
                <div><label className={labelCx}>Discount Value <span className="text-red-400">*</span></label><input type="number" value={form.discVal||""} onChange={e=>upd("discVal",parseFloat(e.target.value))} className={inputCx}/></div>
                {form.discType==="pct"&&<div><label className={labelCx}>Max Cap (AED)</label><input type="number" value={form.cap||""} onChange={e=>upd("cap",parseFloat(e.target.value))} className={inputCx}/></div>}
              </div>
              <div className="flex gap-2 pt-1"><button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 font-medium transition-colors">Cancel</button><button onClick={savePersonal} disabled={!form.userId||!form.discVal} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${form.userId&&form.discVal?"bg-violet-600 hover:bg-violet-500 text-white":"bg-zinc-700 text-zinc-500 cursor-not-allowed"}`}>Create Personal Code</button></div>
            </div>
          )}
        </div>
      )}

      {tab==="auto"&&(
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="bg-amber-950/40 border border-amber-900 rounded-xl px-4 py-3 flex-1 mr-4"><p className="text-xs font-semibold text-amber-400 mb-0.5">Automatic Rule-Based Discounts</p><p className="text-xs text-zinc-500">Apply automatically based on booking conditions. No code required — customers see them at checkout when the rule is met.</p></div>
            <button onClick={openForm} className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-2 rounded-lg transition-colors flex-shrink-0"><Plus size={13}/> Create Auto Discount</button>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-zinc-800"><TH ch="Name"/><TH ch="Trigger"/><TH ch="Discount"/><TH ch="Status"/><TH ch="Actions"/></tr></thead>
              <tbody className="divide-y divide-zinc-800">
                {autos.map(a=>(
                  <tr key={a.id} className="hover:bg-zinc-800/40 transition-colors">
                    <td className="px-4 py-3.5 text-sm font-semibold text-white">{a.name}</td>
                    <td className="px-4 py-3.5"><span className="text-xs bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded-full font-semibold">{a.trigger}</span></td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-white">{discFmt(a)}</td>
                    <td className="px-4 py-3.5"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${a.status==="Active"?"bg-emerald-950 text-emerald-400 border-emerald-800":"bg-zinc-800 text-zinc-500 border-zinc-700"}`}>{a.status}</span></td>
                    <td className="px-4 py-3.5"><div className="flex items-center gap-3"><button onClick={()=>togA(a.id)} className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors">{a.status==="Active"?"Pause":"Activate"}</button><button onClick={()=>delA(a.id)} className="text-xs text-red-400 hover:text-red-300 font-medium transition-colors">Delete</button></div></td>
                  </tr>
                ))}
                {autos.length===0&&<tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-600">No auto discounts yet</td></tr>}
              </tbody>
            </table>
          </div>
          {showForm&&(
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 space-y-4">
              <p className="text-sm font-bold text-white">Create Auto Discount</p>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelCx}>Name <span className="text-red-400">*</span></label><input type="text" placeholder="e.g. First Booking Offer" value={form.name||""} onChange={e=>upd("name",e.target.value)} className={inputCx}/></div>
                <div><label className={labelCx}>Trigger Condition <span className="text-red-400">*</span></label><select value={form.trigger||""} onChange={e=>upd("trigger",e.target.value)} className={selCx}><option value="" className="bg-zinc-900">Select trigger...</option>{TRIGGERS.map(t=><option key={t} value={t} className="bg-zinc-900">{t}</option>)}</select></div>
                <div><label className={labelCx}>Discount Type</label><select value={form.discType||"fixed"} onChange={e=>upd("discType",e.target.value)} className={selCx}><option value="fixed" className="bg-zinc-900">Fixed Amount (AED)</option><option value="pct" className="bg-zinc-900">Percentage (%)</option></select></div>
                <div><label className={labelCx}>Discount Value <span className="text-red-400">*</span></label><input type="number" value={form.discVal||""} onChange={e=>upd("discVal",parseFloat(e.target.value))} className={inputCx}/></div>
                {form.discType==="pct"&&<div><label className={labelCx}>Max Cap (AED)</label><input type="number" value={form.cap||""} onChange={e=>upd("cap",parseFloat(e.target.value))} className={inputCx}/></div>}
              </div>
              <div className="flex gap-2 pt-1"><button onClick={()=>setShowForm(false)} className="flex-1 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm text-zinc-300 font-medium transition-colors">Cancel</button><button onClick={saveAuto} disabled={!form.name||!form.trigger||!form.discVal} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-colors ${form.name&&form.trigger&&form.discVal?"bg-amber-600 hover:bg-amber-500 text-white":"bg-zinc-700 text-zinc-500 cursor-not-allowed"}`}>Create Auto Discount</button></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function TimeSlotsPage(){
  const DAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const [working,setWorking]=useState([true,true,false,false,true,true,false]);
  const SLOTS=[{n:"Morning",s:"09:00 AM",e:"12:00 PM"},{n:"Afternoon",s:"01:00 PM",e:"04:00 PM"},{n:"Evening",s:"05:00 PM",e:"08:00 PM"}];
  const SVCS=["Photo","Short Form Video","Long Form - Daylight","Long Form - Night","Long Form - Day+Night","360 Virtual Tour"];
  const WGTS=[1,1.5,2,2,3,1.5];
  // Property weight state
  const [aptW,setAptW]=useState([1,1.5,2,2.5,3,4]);
  const [vilW,setVilW]=useState([2.5,3,3.5,4,5,6]);
  const [comW,setComW]=useState([2,3,4,5]);
  const APT=["Studio","1 Bed","2 Bed","3 Bed","4 Bed","5 Bed"];
  const VIL=["2 Bed","3 Bed","4 Bed","5 Bed","6 Bed","7 Bed"];
  const COM=["Basic","Essential","Premium","Executive"];

  return(
    <div className="p-6 space-y-5">
      <PH label="Operations" title="Calendar & Time Slot Rules" sub="Manage daily availability, service weights and property weights." action={<button className="bg-white text-black text-xs font-bold px-3.5 py-2 rounded-lg">Save Changes</button>}/>

      {/* System Settings + Block Definitions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-5">
          <p className="text-sm font-semibold text-white">System Settings</p>
          <div><p className="text-xs text-zinc-500 mb-2">Rolling Window (days)</p><input type="number" defaultValue={60} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm w-24 outline-none"/></div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Day Slot Capacity (Fixed)</p>
            <input type="number" defaultValue={6} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-sm w-24 outline-none"/>
            <p className="text-[10px] text-zinc-600 mt-1.5">Formula: Property Weight + Service Weight = Total. Total ≤ Capacity → 1 slot, else 2 slots.</p>
          </div>
          <div>
            <p className="text-xs text-zinc-500 mb-2">Working Days</p>
            <div className="flex flex-wrap gap-2">{DAYS.map((d,i)=>(<button key={d} onClick={()=>setWorking(w=>w.map((v,j)=>j===i?!v:v))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${working[i]?"bg-emerald-900/60 text-emerald-400 border border-emerald-700":"bg-zinc-800 text-zinc-500 border border-zinc-700"}`}>{d}</button>))}</div>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-white">Block Definitions</p>
          {SLOTS.map(s=>(<div key={s.n}><p className="text-xs text-zinc-500 mb-1.5">{s.n}</p><div className="flex items-center gap-2"><input type="text" defaultValue={s.s} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs flex-1 outline-none"/><span className="text-zinc-600 text-xs">to</span><input type="text" defaultValue={s.e} className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs flex-1 outline-none"/></div></div>))}
        </div>
      </div>

      {/* Service Weights */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-white mb-0.5">Service Weights</p>
        <p className="text-xs text-zinc-500 mb-4">Time slot weight assigned to each service type.</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
          {SVCS.map((s,i)=>(
            <div key={s} className="bg-zinc-800 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-medium">{s}</span>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                <span className="text-xs font-bold text-white">{WGTS[i]}</span>
                <div className="w-8 h-4 rounded-full bg-emerald-600 flex items-center justify-end px-0.5 cursor-pointer"><div className="w-3 h-3 rounded-full bg-white shadow"/></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Property Weights */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm font-semibold text-white">Property Weights</p>
            <p className="text-xs text-zinc-500 mt-0.5">Weight per property type and size. Added to service weight to get total shoot slot.</p>
          </div>
          <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-right flex-shrink-0 ml-4">
            <p className="text-[10px] text-zinc-500 mb-0.5">Slot Formula</p>
            <p className="text-xs text-emerald-400 font-mono font-bold">P.Weight + S.Weight = Total</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Apartments */}
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">Apartments</p>
            <div className="space-y-2">
              {APT.map((sz,i)=>(
                <div key={sz} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{sz}</span>
                  <input type="number" value={aptW[i]} step="0.5" min="0.5"
                    onChange={e=>setAptW(w=>w.map((v,j)=>j===i?parseFloat(e.target.value)||v:v))}
                    className="bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs text-white w-16 text-center outline-none focus:border-emerald-500 transition-colors"/>
                </div>
              ))}
            </div>
          </div>
          {/* Villas / Townhouses */}
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">Villas / Townhouses</p>
            <div className="space-y-2">
              {VIL.map((sz,i)=>(
                <div key={sz} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{sz}</span>
                  <input type="number" value={vilW[i]} step="0.5" min="0.5"
                    onChange={e=>setVilW(w=>w.map((v,j)=>j===i?parseFloat(e.target.value)||v:v))}
                    className="bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs text-white w-16 text-center outline-none focus:border-emerald-500 transition-colors"/>
                </div>
              ))}
            </div>
          </div>
          {/* Commercial */}
          <div className="bg-zinc-800/50 rounded-xl p-4">
            <p className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-3">Commercial</p>
            <div className="space-y-2">
              {COM.map((sc,i)=>(
                <div key={sc} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-400">{sc}</span>
                  <input type="number" value={comW[i]} step="0.5" min="0.5"
                    onChange={e=>setComW(w=>w.map((v,j)=>j===i?parseFloat(e.target.value)||v:v))}
                    className="bg-zinc-700 border border-zinc-600 rounded-lg px-2 py-1.5 text-xs text-white w-16 text-center outline-none focus:border-emerald-500 transition-colors"/>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-[10px] text-zinc-600 mt-4">Example: 1 Bed Apartment (weight {aptW[1]}) + Photography (weight 1) = {aptW[1]+1} total &rarr; fits in 1 slot if capacity &ge; {aptW[1]+1}</p>
      </div>
    </div>
  );
}
function PricingPage(){const SIZES=["Studio","1 Bed","2 Bed","3 Bed","4 Bed","5 Bed"];const COLS=["Photography","Short Video","LF Day","LF Night","LF Day+Night","360 Tour"];const P={"Studio":[500,300,500,600,800,300],"1 Bed":[550,300,600,700,950,350],"2 Bed":[600,350,700,800,1100,400],"3 Bed":[700,400,800,950,1300,450],"4 Bed":[800,450,950,1100,1500,500],"5 Bed":[900,500,1100,1300,1700,600]};const[tab,setTab]=useState("apartments");return(<div className="p-6"><PH label="Operations" title="Pricing Configuration" sub="Manage service pricing by property type and size" action={<button className="bg-blue-600 text-white text-xs font-bold px-3.5 py-2 rounded-lg">Save Changes</button>}/><div className="flex gap-2 mb-4">{["apartments","villas","commercial"].map(t=>(<button key={t} onClick={()=>setTab(t)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${tab===t?"bg-white text-black":"bg-zinc-900 text-zinc-400 border border-zinc-800"}`}>{t}</button>))}</div><div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"><div className="px-5 py-3 border-b border-zinc-800"><p className="text-sm font-semibold text-white capitalize">{tab}</p></div><div className="overflow-x-auto"><table className="w-full"><thead><tr className="border-b border-zinc-800"><th className="text-left px-4 py-3 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Size</th>{COLS.map(c=><th key={c} className="text-left px-4 py-3 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest whitespace-nowrap">{c}</th>)}</tr></thead><tbody className="divide-y divide-zinc-800">{SIZES.map(size=>(<tr key={size} className="hover:bg-zinc-800/40"><td className="px-4 py-3 text-sm font-bold text-white">{size}</td>{P[size].map((val,i)=>(<td key={i} className="px-4 py-3"><div className="bg-zinc-800 rounded-lg px-2.5 py-1.5 text-sm text-white font-semibold w-[90px]">AED {val}</div></td>))}</tr>))}</tbody></table></div></div></div>);}
function PortfolioPage(){
  const [tab,setTab]=useState("all");
  const TABS=[
    {id:"all",     label:"All Works",         filter:()=>true},
    {id:"photo",   label:"Photography",        filter:i=>i.type==="IMAGE"},
    {id:"short",   label:"Short Form Video",   filter:i=>i.type==="SHORT_VIDEO"},
    {id:"long",    label:"Long Form Video",    filter:i=>i.type==="VIDEO"},
    {id:"tour",    label:"360° Virtual Tour",  filter:i=>i.type==="360_VIEW"},
  ];
  const TYPE_CX={
    VIDEO:"bg-blue-950 text-blue-400 border-blue-800",
    SHORT_VIDEO:"bg-violet-950 text-violet-400 border-violet-800",
    IMAGE:"bg-amber-950 text-amber-400 border-amber-800",
    "360_VIEW":"bg-emerald-950 text-emerald-400 border-emerald-800",
  };
  const TI=({t})=>{if(t==="VIDEO"||t==="SHORT_VIDEO")return<Video size={10}/>;if(t==="360_VIEW")return<Globe size={10}/>;return<Camera size={10}/>;};
  const curTab=TABS.find(t=>t.id===tab);
  const visible=PORTFOLIO.filter(curTab.filter);
  return(
    <div className="p-6">
      <PH label="Content" title="Portfolio Management" sub="Manage Our Works entries shown on the landing page" action={<button className="flex items-center gap-2 bg-white text-black text-xs font-bold px-3.5 py-2 rounded-lg"><Plus size={13}/> New Entry</button>}/>
      <div className="flex gap-2 mb-5 flex-wrap">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab===t.id?"bg-white text-black":"bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-600"}`}>
            {t.label} <span className="opacity-60">({PORTFOLIO.filter(t.filter).length})</span>
          </button>
        ))}
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-zinc-800"><TH ch=""/><TH ch="Title"/><TH ch="Location"/><TH ch="Type"/><TH ch="Status"/><TH ch="Actions"/></tr></thead>
          <tbody className="divide-y divide-zinc-800">
            {visible.map(item=>(
              <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                <td className="px-4 py-3.5 w-6 text-zinc-700 text-xs select-none">&#8942;</td>
                <td className="px-4 py-3.5"><p className="text-sm text-white font-medium">{item.title}</p></td>
                <td className="px-4 py-3.5"><p className="text-xs text-zinc-500">{item.sub}</p></td>
                <td className="px-4 py-3.5"><span className={`flex items-center gap-1.5 w-fit px-2 py-0.5 rounded-full text-[11px] font-bold border ${TYPE_CX[item.type]}`}><TI t={item.type}/>{item.type.replace("_"," ")}</span></td>
                <td className="px-4 py-3.5"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-950 text-emerald-400 border-emerald-800">Visible</span></td>
                <td className="px-4 py-3.5"><div className="flex items-center gap-3"><button className="text-zinc-500 hover:text-white transition-colors"><Pencil size={13}/></button><button className="text-zinc-500 hover:text-zinc-300 transition-colors"><EyeOff size={13}/></button><button className="text-zinc-500 hover:text-red-400 transition-colors"><Trash2 size={13}/></button></div></td>
              </tr>
            ))}
            {visible.length===0&&<tr><td colSpan={6} className="px-4 py-12 text-center text-xs text-zinc-600">No entries in this category</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function ReviewsPage(){return(<div className="p-6"><PH label="Content" title="Reviews Management" sub="Manage testimonial reviews shown on the landing page" action={<button className="flex items-center gap-2 bg-white text-black text-xs font-bold px-3.5 py-2 rounded-lg"><Plus size={13}/> New Review</button>}/><div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"><table className="w-full"><thead><tr className="border-b border-zinc-800"><TH ch="Client"/><TH ch="Rating"/><TH ch="Preview"/><TH ch="Status"/><TH ch="Featured"/><TH ch="Actions"/></tr></thead><tbody className="divide-y divide-zinc-800">{REVIEWS.map(r=>(<tr key={r.id} className="hover:bg-zinc-800/40"><td className="px-4 py-3.5"><p className="text-sm text-white font-medium">{r.name}</p><p className="text-xs text-zinc-500">{r.title}</p></td><td className="px-4 py-3.5"><div className="flex gap-0.5">{Array.from({length:5}).map((_,i)=><Star key={i} size={11} className="text-amber-400 fill-amber-400"/>)}</div></td><td className="px-4 py-3.5 max-w-[200px]"><p className="text-xs text-zinc-400 truncate">{r.text}</p></td><td className="px-4 py-3.5"><span className="px-2 py-0.5 rounded-full text-[11px] font-bold border bg-emerald-950 text-emerald-400 border-emerald-800">Visible</span></td><td className="px-4 py-3.5 text-xs text-zinc-500">Standard</td><td className="px-4 py-3.5"><div className="flex items-center gap-3"><button className="text-zinc-500 hover:text-white transition-colors"><Pencil size={13}/></button><button className="text-zinc-500 hover:text-amber-400 transition-colors"><Star size={13}/></button><button className="text-zinc-500 hover:text-zinc-300 transition-colors"><EyeOff size={13}/></button><button className="text-zinc-500 hover:text-red-400 transition-colors"><Trash2 size={13}/></button></div></td></tr>))}</tbody></table></div></div>);}

/* ── APP ── */
function SettingsPage(){
  const SECTIONS=[
    {id:"dashboard", label:"Dashboard",    group:"Workspace"},
    {id:"bookings",  label:"Bookings",     group:"Workspace"},
    {id:"calendar",  label:"Calendar",     group:"Workspace"},
    {id:"users",     label:"Customers",    group:"Workspace"},
    {id:"invoices",  label:"Invoices",     group:"Finance"},
    {id:"reports",   label:"Reports",      group:"Finance"},
    {id:"coupons",   label:"Coupons",      group:"Operations"},
    {id:"timeslots", label:"Time Slots",   group:"Operations"},
    {id:"pricing",   label:"Pricing",      group:"Operations"},
    {id:"portfolio", label:"Portfolio",    group:"Content"},
    {id:"reviews",   label:"Reviews",      group:"Content"},
    {id:"settings",  label:"Settings",     group:"System"},
  ];
  const GROUPS=["Workspace","Finance","Operations","Content","System"];
  const ROLES=[
    {id:"superadmin",label:"Super Admin",  desc:"Full access — owner only. All sections always visible.",       color:"text-red-400",     ringCx:"ring-red-900/40",  locked:true},
    {id:"admin",     label:"Admin",        desc:"Operations manager. Access to all non-financial sections.",    color:"text-blue-400",    ringCx:"ring-blue-900/40", locked:false},
    {id:"accounts",  label:"Accounts",     desc:"Finance team. Invoices and reports only.",                     color:"text-emerald-400", ringCx:"ring-emerald-900/40",locked:false},
  ];
  const [access,setAccess]=useState({
    admin:   {dashboard:true,bookings:true,calendar:true,users:true,invoices:false,reports:false,coupons:true,timeslots:true,pricing:true,portfolio:true,reviews:true,settings:false},
    accounts:{dashboard:true,bookings:false,calendar:false,users:false,invoices:true,reports:true,coupons:false,timeslots:false,pricing:false,portfolio:false,reviews:false,settings:false},
  });
  const [invite,setInvite]=useState({email:"",role:"admin"});
  const toggle=(role,sec)=>setAccess(p=>({...p,[role]:{...p[role],[sec]:!p[role][sec]}}));
  const count=(role)=>Object.values(access[role]).filter(Boolean).length;

  return(
    <div className="p-6 space-y-5">
      <PH label="System" title="Settings" sub="Manage admin access levels — separate from customer accounts."/>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {ROLES.map(r=>(
          <div key={r.id} className={`bg-zinc-900 border border-zinc-800 rounded-xl p-5 ring-1 ${r.ringCx}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-800 flex items-center justify-center"><Settings size={15} className={r.color}/></div>
              {r.locked?(<span className="text-[10px] bg-zinc-800 text-zinc-500 border border-zinc-700 px-2 py-0.5 rounded-full font-bold">Locked</span>):(
                <span className={`text-[10px] font-bold ${r.color}`}>{count(r.id)}/{SECTIONS.length} sections</span>
              )}
            </div>
            <p className="text-sm font-bold text-white">{r.label}</p>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{r.desc}</p>
            {r.locked&&(
              <div className="flex flex-wrap gap-1 mt-3">
                {SECTIONS.map(s=>(<span key={s.id} className="text-[9px] bg-emerald-950/60 text-emerald-500 px-1.5 py-0.5 rounded font-medium">{s.label}</span>))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800">
          <p className="text-sm font-semibold text-white">Permission Matrix</p>
          <p className="text-xs text-zinc-500 mt-0.5">Toggle what Admin and Accounts roles can access. Super Admin always has full access.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-zinc-800">
              <th className="text-left px-5 py-3 text-[10px] text-zinc-500 font-semibold uppercase tracking-widest">Section</th>
              <th className="px-5 py-3 text-[10px] text-red-400 font-semibold uppercase tracking-widest text-center">Super Admin</th>
              <th className="px-5 py-3 text-[10px] text-blue-400 font-semibold uppercase tracking-widest text-center">Admin</th>
              <th className="px-5 py-3 text-[10px] text-emerald-400 font-semibold uppercase tracking-widest text-center">Accounts</th>
            </tr></thead>
            <tbody>
              {GROUPS.map(grp=>{
                const secs=SECTIONS.filter(s=>s.group===grp);
                return secs.map((s,si)=>(
                  <tr key={s.id} className={`border-b border-zinc-800/60 hover:bg-zinc-800/30 transition-colors ${si===0?"border-t border-zinc-700":""}`}>
                    <td className="px-5 py-3">
                      {si===0&&<p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold mb-0.5">{grp}</p>}
                      <p className="text-sm text-zinc-300 font-medium">{s.label}</p>
                    </td>
                    <td className="px-5 py-3 text-center"><span className="text-emerald-500 font-bold">&#10003;</span></td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={()=>toggle("admin",s.id)} className={`w-9 h-5 rounded-full transition-colors flex items-center mx-auto ${access.admin[s.id]?"bg-blue-600":"bg-zinc-700"}`}>
                        <span className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mx-0.5 ${access.admin[s.id]?"translate-x-4":"translate-x-0"}`}/>
                      </button>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={()=>toggle("accounts",s.id)} className={`w-9 h-5 rounded-full transition-colors flex items-center mx-auto ${access.accounts[s.id]?"bg-emerald-600":"bg-zinc-700"}`}>
                        <span className={`w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mx-0.5 ${access.accounts[s.id]?"translate-x-4":"translate-x-0"}`}/>
                      </button>
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
        <div className="px-5 py-4 border-t border-zinc-800 flex items-center justify-between">
          <p className="text-xs text-zinc-600">Changes apply to new sessions. Connect your backend to persist access levels.</p>
          <button className="bg-white text-black text-xs font-bold px-3.5 py-2 rounded-lg hover:bg-zinc-100 transition-colors">Save Access Levels</button>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <p className="text-sm font-semibold text-white mb-0.5">Invite Admin Team Member</p>
        <p className="text-xs text-zinc-500 mb-4">Send an invite to a staff member. They will appear in the admin portal only — separate from customer accounts.</p>
        <div className="flex gap-3 flex-wrap">
          <input type="email" placeholder="Email address" value={invite.email} onChange={e=>setInvite(i=>({...i,email:e.target.value}))}
            className="flex-1 min-w-[200px] bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-zinc-500 transition-colors"/>
          <select value={invite.role} onChange={e=>setInvite(i=>({...i,role:e.target.value}))}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-zinc-500 transition-colors">
            <option value="admin"    className="bg-zinc-900">Admin</option>
            <option value="accounts" className="bg-zinc-900">Accounts</option>
          </select>
          <button onClick={()=>setInvite({email:"",role:"admin"})}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors whitespace-nowrap">
            <Plus size={13}/> Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App(){
  const [page,setPage]=useState("dashboard");
  const PAGES={bookings:<BookingsPage/>,calendar:<CalendarPage/>,invoices:<InvoicesPage/>,reports:<ReportsPage/>,coupons:<CouponsPage/>,timeslots:<TimeSlotsPage/>,pricing:<PricingPage/>,portfolio:<PortfolioPage/>,reviews:<ReviewsPage/>,users:<UsersPage/>,settings:<SettingsPage/>};
  const allItems=NAV_GROUPS.flatMap(g=>g.items);
  const current=allItems.find(n=>n.id===page);
  const curGroup=NAV_GROUPS.find(g=>g.items.some(i=>i.id===page));
  return(
    <div className="flex h-screen bg-zinc-950 overflow-hidden" style={{fontFamily:"system-ui,-apple-system,sans-serif"}}>
      <aside className="w-52 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-800"><p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-0.5">Admin Portal</p><p className="text-sm font-black text-white tracking-[0.15em]">MILKYWAYY</p></div>
        <nav className="flex-1 py-2 overflow-y-auto">
          {NAV_GROUPS.map((group,gi)=>(
            <div key={gi} className={gi>0?"mt-1":""}>
              <div className="px-4 pt-4 pb-1.5"><p className="text-[9px] text-zinc-600 uppercase tracking-widest font-semibold">{group.label}</p></div>
              {group.items.map(n=>(<button key={n.id} onClick={()=>setPage(n.id)} className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors relative ${page===n.id?"bg-zinc-800 text-white font-semibold":"text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/40"}`}>{page===n.id&&<div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-emerald-400 rounded-r-full"/>}<n.icon size={14} className={page===n.id?"text-white":""}/><span className="truncate">{n.label}</span>{n.badge&&<span className="ml-auto text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.5 rounded-full font-black">{n.badge}</span>}</button>))}
            </div>
          ))}
        </nav>
        <div className="border-t border-zinc-800 p-4"><button className="w-full flex items-center gap-2.5 text-xs text-zinc-500 hover:text-red-400 transition-colors font-medium"><LogOut size={13}/> Log Out</button></div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-zinc-900 border-b border-zinc-800 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2"><span className="text-[10px] text-zinc-600 uppercase tracking-widest">{curGroup?.label}</span><span className="text-zinc-700 text-xs">/</span><span className="text-[10px] text-zinc-400 font-medium">{current?.label}</span></div>
          <div className="flex items-center gap-3"><div className="text-right hidden sm:block"><p className="text-xs text-white font-semibold leading-none">Akash</p><p className="text-[10px] text-zinc-500 mt-0.5">Super Admin</p></div><div className="w-7 h-7 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center flex-shrink-0"><span className="text-[10px] text-zinc-300 font-bold">AK</span></div></div>
        </header>
        <div className="flex-1 overflow-y-auto">{page==="dashboard"?<Dashboard go={setPage}/>:PAGES[page]}</div>
      </main>
    </div>
  );
}
