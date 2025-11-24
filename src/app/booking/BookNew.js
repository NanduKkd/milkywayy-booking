'use client';
import { use, useState, useEffect, useRef } from 'react';
import { bookingSchema } from '@/lib/schema/booking.schema';
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from 'react-hook-form';
import { michroma } from '@/fonts';
import PhoneNumberInput from '@/components/PhoneInput';
import {
  Button,
  Input,
  Select,
  SelectItem,
  Card,
  CardBody,
  CardHeader,
  Divider,
  cn,
} from "@heroui/react";
import CustomCalendar from '@/components/CustomCalendar';
import StarBackground from '@/components/StarBackground';
import { Copy, Plus, Trash2, Camera, Video, Globe, Building2, Home, Building, ChevronDown, ChevronUp, Calendar, Clock, MapPin } from 'lucide-react';
import { HeroTelInput } from "@hyperse/hero-tel-input";

import { PRICING_CONFIG, SERVICE_ICONS as SERVICE_ICONS_KEYS } from '@/lib/config/pricing';

const SERVICE_ICONS = {
  'Photography': Camera,
  'Videography': Video,
  '360° Tour': Globe,
};



const PROPERTY_TYPE_ICONS = {
  'Apartment': Building2,
  'Villa': Home,
  'Townhouse/Penthouse': Home,
  'Commercial': Building,
};

export default function BookNew({ bookingsPromise, pricingsPromise }) {
  const bookings = use(bookingsPromise);
  const pricings = use(pricingsPromise);
  const [showCalendar, setShowCalendar] = useState({});
  const [openPropertyIndex, setOpenPropertyIndex] = useState(0);
  const calendarRefs = useRef({});

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(bookingSchema),
    mode: 'all',
    defaultValues: {
      properties: [{
        propertyType: '',
        propertySize: '',
        services: [],
        preferredDate: '',
        timeSlot: '',
        building: '',
        community: '',
        unitNumber: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
      }],
    },
  });

  const properties = useWatch({
    control,
    name: 'properties',
  });

  // Generate time slots (9 AM to 7 PM)
  const timeSlots = [
    { value: 'morning', label: 'Morning' },
    { value: 'afternoon', label: 'Afternoon' },
    { value: 'evening', label: 'Evening' },
  ];

  // Close calendars when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      Object.keys(calendarRefs.current).forEach(key => {
        if (calendarRefs.current[key] && !calendarRefs.current[key].contains(event.target)) {
          setShowCalendar(prev => ({...prev, [key]: false}));
        }
      });
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleDateSelect = (index, date) => {
    const formattedDate = date.toISOString().split('T')[0];
    setValue(`properties.${index}.preferredDate`, formattedDate, { shouldValidate: true });
    setShowCalendar(prev => ({...prev, [index]: false}));
  };

  const addProperty = () => {
    const currentProperties = getValues('properties');
    setValue('properties', [
      ...currentProperties,
      {
        propertyType: '',
        propertySize: '',
        services: [],
        preferredDate: '',
        timeSlot: '',
        building: '',
        community: '',
        unitNumber: '',
        contactName: '',
        contactPhone: '',
        contactEmail: '',
      }
    ], { shouldValidate: true });
    setOpenPropertyIndex(currentProperties.length);
  };

  const duplicateProperty = (index) => {
    const currentProperties = getValues('properties');
    const propertyToDuplicate = {...currentProperties[index]};
    setValue('properties', [
      ...currentProperties,
      propertyToDuplicate
    ], { shouldValidate: true });
    setOpenPropertyIndex(currentProperties.length);
  };

  const removeProperty = (index) => {
    const currentProperties = getValues('properties');
    if (currentProperties.length > 1) {
      setValue('properties', currentProperties.filter((_, i) => i !== index));
      if (index === openPropertyIndex) {
        setOpenPropertyIndex(index > 0 ? index - 1 : 0);
      } else if (index < openPropertyIndex) {
        setOpenPropertyIndex(openPropertyIndex - 1);
      }
    }
  };

  const toggleService = async (index, serviceName, currentServices) => {
    const newServices = currentServices.includes(serviceName)
      ? currentServices.filter(s => s !== serviceName)
      : [...currentServices, serviceName];
    setValue(`properties.${index}.services`, newServices, {shouldValidate: true});
    // await trigger(`properties.${index}.services`);
  };

  const onSubmit = async (data) => {
    try {
      const bookingData = {
        properties: data.properties,
        total: calculateTotal(),
      };
      console.log('Booking data:', bookingData);
      alert('Booking created successfully! (Frontend only - no backend yet)');
    } catch (error) {
      alert(error.message || 'Failed to create booking');
    }
  };

  const calculateTotal = () => {
    return properties.reduce((total, property) => {
      return total + getPropertyPrice(property);
    }, 0);
  };

  const getPropertyPrice = (property) => {
    if (!property.propertyType || !property.propertySize || !property.services) return 0;
    const typeConfig = PRICING_CONFIG[property.propertyType];
    if (!typeConfig) return 0;
    
    const sizeConfig = typeConfig.sizes.find(s => s.label === property.propertySize);
    if (!sizeConfig) return 0;

    return property.services.reduce((total, service) => {
      return total + (sizeConfig.prices[service] || 0);
    }, 0);
  };

  useEffect(() => {
    console.log('Errors', errors)
  }, [errors])

  return (
    <div className="min-h-screen bg-[#121212] text-white py-8 dark relative">
      <StarBackground />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">

        <div className="mb-8 text-center">
          <h1 className={`text-2xl md:text-3xl font-bold text-white mb-2 ${michroma.className}`}>Book Your Property Shoot</h1>
          <p className="text-gray-400">
            Add your property details and preferred schedule
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-6">
            {properties?.map((property, index) => {
              const price = getPropertyPrice(property);
              const titleParts = [];
              if (property.community) titleParts.push(property.community);
              if (property.propertyType) titleParts.push(property.propertyType);
              if (property.propertySize) titleParts.push(property.propertySize);

              return (
                <Card 
                  key={index} 
                  className={cn(
                    "bg-[#181818bb] border border-zinc-800 shadow-none overflow-visible",
                    index === openPropertyIndex ? "relative z-10" : "relative z-0"
                  )}
                >
                  <CardHeader 
                    className="flex justify-between items-center pb-4 cursor-pointer"
                    onClick={() => setOpenPropertyIndex(index === openPropertyIndex ? -1 : index)}
                  >
                    <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2 text-base md:text-xl font-semibold text-white">
                      {index !== openPropertyIndex && titleParts.length > 0 ? (
                        titleParts.map((part, idx) => (
                          <div key={idx} className="flex items-center gap-2 whitespace-nowrap">
                            <span>{part}</span>
                            {idx < titleParts.length - 1 && (
                              <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                            )}
                          </div>
                        ))
                      ) : (
                        <span>Property {index + 1}</span>
                      )}
                      {price > 0 && (
                        <div className="w-full md:hidden mt-1">
                          <span className="bg-zinc-800 px-3 py-1 rounded-md text-sm font-medium text-white">
                            AED {price}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {price > 0 && (
                        <div className="hidden md:block bg-zinc-800 px-3 py-1 rounded-md text-sm font-medium text-white mr-2">
                          AED {price}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="light"
                        className="text-gray-400 hover:text-white"
                        isIconOnly
                        onClick={(e) => { e.stopPropagation(); duplicateProperty(index); }}
                        title="Duplicate"
                      >
                        <Copy size={18} />
                      </Button>
                      {properties.length > 1 && (
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          isIconOnly
                          onClick={(e) => { e.stopPropagation(); removeProperty(index); }}
                          title="Remove"
                        >
                          <Trash2 size={18} />
                        </Button>
                      )}
                      <div className="ml-2">
                        {index === openPropertyIndex ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                      </div>
                    </div>
                  </CardHeader>
                  
                  {index !== openPropertyIndex && (
                    <CardBody className="pt-0 pb-4 space-y-4">
                      {/* Date & Time */}
                      <div className="flex items-center gap-6 text-gray-400 text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span>{property.preferredDate || 'Select Date'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock size={16} />
                          <span className="capitalize">{property.timeSlot || 'Select Time'}</span>
                        </div>
                      </div>

                      {/* Services */}
                      <div>
                        <div className="text-md text-white mb-2">Services:</div>
                        <div className="flex flex-wrap gap-2">
                          {property.services?.length > 0 ? (
                            property.services.map(s => (
                              <span key={s} className="bg-zinc-800 text-gray-300 px-3 py-1 rounded-full text-xs">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 text-sm italic">No services selected</span>
                          )}
                        </div>
                      </div>
                      
                      {errors.properties?.[index] && (
                        <p className="text-red-500 text-sm mt-2">Please fill all fields</p>
                      )}
                    </CardBody>
                  )}

                {index === openPropertyIndex && (
                  <>
                    <Divider className="bg-zinc-800" />
                    <CardBody className="pt-6 space-y-8 overflow-visible">
                  {/* Property Type Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-3">Property Type</label>
                    <Controller
                      name={`properties.${index}.propertyType`}
                      control={control}
                      render={({ field }) => (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Object.keys(PRICING_CONFIG).map((type) => {
                            const Icon = PROPERTY_TYPE_ICONS[type] || Building;
                            return (
                              <div
                                key={type}
                                className={cn(
                                  "cursor-pointer rounded-xl border p-4 text-center transition-all flex flex-col items-center justify-center gap-3 h-24",
                                  field.value === type 
                                    ? "border-white bg-[#272727] text-white" 
                                    : "border-zinc-700 bg-[#272727] text-gray-400 hover:border-zinc-500"
                                )}
                                onClick={() => {
                                  setValue(`properties.${index}.propertyType`, type, {shouldValidate: true});
                                  setValue(`properties.${index}.propertySize`, '');
                                  setValue(`properties.${index}.services`, []);
                                }}
                              >
                                <Icon size={24} />
                                <span className="text-sm font-medium">{type}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    />
                    {errors.properties?.[index]?.propertyType && (
                      <p className="text-red-500 text-sm mt-1">{errors.properties[index].propertyType.message}</p>
                    )}
                  </div>

                  {/* Property Size Selection - Conditional */}
                  {property.propertyType && PRICING_CONFIG[property.propertyType] && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <label className="block text-sm font-medium text-gray-400 mb-3">Property Size</label>
                      <Controller
                        name={`properties.${index}.propertySize`}
                        control={control}
                        render={({ field }) => (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {PRICING_CONFIG[property.propertyType].sizes.map((sizeObj) => (
                              <div
                                key={sizeObj.label}
                                className={cn(
                                  "cursor-pointer rounded-lg border px-4 py-3 text-sm text-center transition-all",
                                  field.value === sizeObj.label
                                    ? "border-white bg-[#272727] text-white font-medium"
                                    : "border-zinc-700 bg-[#272727] text-gray-400 hover:border-zinc-500"
                                )}
                                onClick={() => {
                                  setValue(`properties.${index}.propertySize`, sizeObj.label, {shouldValidate: true});
                                  setValue(`properties.${index}.services`, []);
                                }}
                              >
                                {sizeObj.label}
                              </div>
                            ))}
                          </div>
                        )}
                      />
                      {errors.properties?.[index]?.propertySize && (
                        <p className="text-red-500 text-sm mt-1">{errors.properties[index].propertySize.message}</p>
                      )}
                    </div>
                  )}

                  {/* Services Selection - Conditional */}
                  {property.propertySize && property.propertyType && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-300">
                      <label className="block text-sm font-medium text-gray-400 mb-3">Services (Multiple Selection)</label>
                      <Controller
                        name={`properties.${index}.services`}
                        control={control}
                        render={({ field }) => (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {(() => {
                              const typeConfig = PRICING_CONFIG[property.propertyType];
                              const sizeConfig = typeConfig.sizes.find(s => s.label === property.propertySize);
                              if (!sizeConfig) return null;

                              return Object.entries(sizeConfig.prices).map(([serviceName, price]) => {
                                const Icon = SERVICE_ICONS[serviceName] || Camera;
                                const isSelected = field.value?.includes(serviceName);
                                return (
                                  <div
                                    key={serviceName}
                                    className={cn(
                                      "cursor-pointer rounded-xl border p-6 text-center transition-all",
                                      isSelected
                                        ? "border-white bg-[#272727] text-white"
                                        : "border-zinc-700 bg-[#272727] text-gray-400 hover:border-zinc-500"
                                    )}
                                    onClick={() => toggleService(index, serviceName, field.value || [])}
                                  >
                                    <div className="flex flex-col items-center gap-3">
                                      <Icon size={32} className={isSelected ? "text-white" : "text-gray-400"} />
                                      <div>
                                        <div className="font-semibold mb-1">{serviceName}</div>
                                        <div className="text-sm text-gray-500">AED {price}</div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        )}
                      />
                      {errors.properties?.[index]?.services && (
                        <p className="text-red-500 text-sm mt-1">{errors.properties[index].services.message}</p>
                      )}
                    </div>
                  )}

                  {/* Date and Time Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Preferred Date */}
                    <div className="relative" ref={el => calendarRefs.current[index] = el}>
                      <Controller
                        name={`properties.${index}.preferredDate`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <div className="group flex flex-col gap-1.5">
                            <label className="text-sm text-gray-400">Preferred Date</label>
                            <Input
                              {...field}
                              type="text"
                              placeholder="Pick a date"
                              variant="bordered"
                              readOnly
                              onClick={() => setShowCalendar(prev => ({...prev, [index]: !prev[index]}))}
                              errorMessage={fieldState.error?.message}
                              isInvalid={!!fieldState.error}
                              classNames={{
                                inputWrapper: "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                                input: "text-white"
                              }}
                            />
                            {showCalendar[index] && (
                              <div className="absolute z-50 mt-14">
                                <CustomCalendar
                                  selectedDate={field.value ? new Date(field.value) : null}
                                  onDateChange={(date) => handleDateSelect(index, date)}
                                  minDate={new Date()}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      />
                    </div>

                    {/* Time Slot */}
                    <Controller
                      name={`properties.${index}.timeSlot`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <div className="group flex flex-col gap-1.5">
                          <label className="text-sm text-gray-400">Time Slot</label>
                          <Select
                            {...field}
                            placeholder="Select time slot"
                            variant="bordered"
                            selectedKeys={field.value ? [field.value] : []}
                            onSelectionChange={(keys) => {
                              const value = Array.from(keys)[0];
                              field.onChange(value);
                            }}
                            errorMessage={fieldState.error?.message}
                            isInvalid={!!fieldState.error}
                            classNames={{
                              trigger: "bg-[#272727] border-zinc-700 hover:border-zinc-500 data-[focus=true]:border-white",
                              value: "text-white",
                              popoverContent: "bg-[#181818] border border-zinc-800"
                            }}
                          >
                            {timeSlots.map(slot => (
                              <SelectItem key={slot.value} value={slot.value} className="text-white hover:bg-zinc-800 data-[hover=true]:bg-zinc-800">
                                {slot.label}
                              </SelectItem>
                            ))}
                          </Select>
                        </div>
                      )}
                    />
                  </div>

                  <Divider className="bg-zinc-800" />

                  {/* Location Details */}
                  {/* Location Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {/* Building / Tower Name */}
                    <Controller
                      name={`properties.${index}.building`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <div className="group flex flex-col gap-1.5">
                          <label className="text-sm text-gray-400">Building / Tower Name</label>
                          <Input
                            {...field}
                            placeholder="eg. Burj Khalifa"
                            variant="bordered"
                            errorMessage={fieldState.error?.message}
                            isInvalid={!!fieldState.error}
                            classNames={{
                              inputWrapper: "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                              input: "text-white"
                            }}
                          />
                        </div>
                      )}
                    />

                    {/* Community / Area */}
                    <Controller
                      name={`properties.${index}.community`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <div className="group flex flex-col gap-1.5">
                          <label className="text-sm text-gray-400">Community / Area</label>
                          <Input
                            {...field}
                            placeholder="eg. Downtown"
                            variant="bordered"
                            errorMessage={fieldState.error?.message}
                            isInvalid={!!fieldState.error}
                            classNames={{
                              inputWrapper: "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                              input: "text-white"
                            }}
                          />
                        </div>
                      )}
                    />

                    {/* Unit Number */}
                    <Controller
                      name={`properties.${index}.unitNumber`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <div className="group flex flex-col gap-1.5">
                          <label className="text-sm text-gray-400">Unit Number (Optional)</label>
                          <Input
                            {...field}
                            placeholder="eg. 1205"
                            variant="bordered"
                            errorMessage={fieldState.error?.message}
                            isInvalid={!!fieldState.error}
                            classNames={{
                              inputWrapper: "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                              input: "text-white"
                            }}
                          />
                        </div>
                      )}
                    />
                  </div>

                  <Divider className="bg-zinc-800" />

                  {/* Point of Contact */}
                  <div>
                    <h3 className="text-md font-medium text-white mb-4">Point of Contact</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                      {/* Name */}
                      <Controller
                        name={`properties.${index}.contactName`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <div className="group flex flex-col gap-1.5">
                            <label className="text-sm text-gray-400">Name</label>
                            <Input
                              {...field}
                              placeholder="Enter contact name"
                              variant="bordered"
                              errorMessage={fieldState.error?.message}
                              isInvalid={!!fieldState.error}
                              classNames={{
                                inputWrapper: "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                                input: "text-white"
                              }}
                            />
                          </div>
                        )}
                      />

                      {/* Phone */}
                      <Controller
                        name={`properties.${index}.contactPhone`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <div className="group flex flex-col gap-1.5">
                            <label className="block text-sm text-gray-400">Phone Number</label>
                            <PhoneNumberInput
                              onChange={(v) => field.onChange(v)}
                              name={field.name}
                              classNames={{
                                inputWrapper: "flex items-center w-full px-3 rounded-xl bg-[#272727] border-2 border-zinc-700 hover:border-zinc-500 focus-within:!border-white transition-colors h-10",
                                input: "bg-transparent border-none outline-none text-white w-full placeholder:text-gray-500 text-sm h-full",
                                countryIcon: "mr-2 flex items-center h-full",
                              }}
                            />
                            {fieldState.error ? <div className="text-red-500 text-xs ml-1">{fieldState.error.message}</div> : null }
                          </div>
                          /*
                          <HeroTelInput
                            {...field}
                            label="Phone Number"
                            labelPlacement="outside"
                            placeholder="Enter phone number"
                            defaultCountry="AE"
                            variant="bordered"
                            errorMessage={fieldState.error?.message}
                            isInvalid={!!fieldState.error}
                            excludedCountries={['TA', 'AC']}
                            classNames={{
                              input: {
                                inputWrapper: "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                                label: "!text-gray-400",
                                input: "text-white",
                              },
                              dialog: '!max-h-200',
                              modal: '!max-h-200',
                              overlay: 'overflow-hidden',
                              dialogContent: "bg-[#181818] border border-zinc-800 text-white !max-h-200",
                              menuItem: "text-white hover:bg-zinc-800 data-[selected=true]:bg-zinc-800",
                              searchInput: "bg-[#272727] text-white border-zinc-700 placeholder:text-gray-500",
                            }}
                          />
                          */
                        )}
                      />

                      {/* Email */}
                      <Controller
                        name={`properties.${index}.contactEmail`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <div className="group flex flex-col gap-1.5">
                            <label className="text-sm text-gray-400">Email Address (Optional)</label>
                            <Input
                              {...field}
                              placeholder="Enter email address"
                              variant="bordered"
                              errorMessage={fieldState.error?.message}
                              isInvalid={!!fieldState.error}
                              classNames={{
                                inputWrapper: "bg-[#272727] border-zinc-700 hover:border-zinc-500 group-data-[focus=true]:border-white",
                                input: "text-white"
                              }}
                            />
                          </div>
                        )}
                      />
                    </div>
                  </div>
                </CardBody>
              </>
            )}
          </Card>
        );
      })}

            {/* Add Property Button */}
            <Button
              type="button"
              variant="ghost"
              className="border-dashed"
              // color="primary"
              startContent={<Plus size={20} />}
              onClick={addProperty}
              className="w-full"
            >
              Add Another Property
            </Button>
          </div>

          {/* Pricing Summary */}
          <Card className="bg-[#181818] border border-zinc-800 shadow-none">
            <CardBody>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-white">Pricing Summary</h3>
                  <p className="text-sm text-gray-400 mt-1">
                    {properties.length} {properties.length === 1 ? 'Property' : 'Properties'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-400">Grand Total</p>
                  <p className="text-2xl font-bold text-white">
                    AED {calculateTotal().toLocaleString()}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              // color="primary"
              size="lg"
              isLoading={isSubmitting}
              className="px-8"
              fullWidth
            >
              {isSubmitting ? 'Submitting...' : 'Continue to Payment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
