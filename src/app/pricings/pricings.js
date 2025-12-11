"use client";
import { use } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import FileUpload from "@/components/FileUpload";
// import { savePricings } from '@/lib/actions/dynamicConfig';
import { makeCustomFormData } from "@/lib/helpers/customFormData";
import { Label } from "@/components/ui/label";

const propertyTypeSchema = z.object({
  propertyType: z.string().min(1, "Property type is required"),
  photo: z.string().min(1, "Photo price is required"),
  video: z.string().min(1, "Video price is required"),
  combined: z.string().min(1, "Combined price is required"),
});

const sectionSchema = z.object({
  title: z.string().min(1, "Section title is required"),
  subtitle: z.string().optional(),
  icon: z.any().optional(),
  propertyTypes: z.array(propertyTypeSchema),
});

const pricingSchema = z.object({
  sections: z.array(sectionSchema),
});

function PropertyTypeSection({ sectionIndex, control }) {
  const {
    fields: propertyFields,
    append: appendProperty,
    remove: removeProperty,
  } = useFieldArray({
    control,
    name: `sections.${sectionIndex}.propertyTypes`,
  });

  const addPropertyType = () => {
    appendProperty({
      propertyType: "",
      photo: "",
      video: "",
      combined: "",
    });
  };

  const removePropertyType = (index) => {
    removeProperty(index);
  };

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Property Type</TableHead>
              <TableHead>Photo</TableHead>
              <TableHead>Video</TableHead>
              <TableHead>Combined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {propertyFields.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No property types added yet
                </TableCell>
              </TableRow>
            ) : (
              propertyFields.map((field, propertyIndex) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <Controller
                      name={`sections.${sectionIndex}.propertyTypes.${propertyIndex}.propertyType`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <div>
                          <Input
                            {...field}
                            placeholder="Property type"
                            className={fieldState.error ? "border-red-500" : ""}
                          />
                          {fieldState.error && (
                            <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      name={`sections.${sectionIndex}.propertyTypes.${propertyIndex}.photo`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <div>
                          <Input
                            {...field}
                            placeholder="Price"
                            type="number"
                            className={fieldState.error ? "border-red-500" : ""}
                          />
                          {fieldState.error && (
                            <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      name={`sections.${sectionIndex}.propertyTypes.${propertyIndex}.video`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <div>
                          <Input
                            {...field}
                            placeholder="Price"
                            type="number"
                            className={fieldState.error ? "border-red-500" : ""}
                          />
                          {fieldState.error && (
                            <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Controller
                      name={`sections.${sectionIndex}.propertyTypes.${propertyIndex}.combined`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <div>
                          <Input
                            {...field}
                            placeholder="Price"
                            type="number"
                            className={fieldState.error ? "border-red-500" : ""}
                          />
                          {fieldState.error && (
                            <p className="text-xs text-red-500 mt-1">{fieldState.error.message}</p>
                          )}
                        </div>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePropertyType(propertyIndex)}
                      disabled={propertyFields.length === 1}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      type="button"
                    >
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mt-4">
        <Button
          variant="secondary"
          type="button"
          onClick={addPropertyType}
        >
          Add Property Type
        </Button>
      </div>
    </>
  );
}

export default function PricingsPage({ existingsPromise }) {
  const existings = use(existingsPromise);
  const {
    control,
    handleSubmit,
    formState: { isSubmitting, isDirty },
  } = useForm({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      sections: existings,
    },
  });

  const {
    fields: sectionFields,
    append: appendSection,
    remove: removeSection,
  } = useFieldArray({
    control,
    name: "sections",
  });

  const addSection = () => {
    appendSection({
      title: "",
      subtitle: "",
      icon: null,
      propertyTypes: [],
    });
  };

  const removeSectionHandler = (index) => {
    removeSection(index);
  };

  const onSubmit = async (data) => {
    try {
      // await savePricings(data);
      // console.log(makeCustomFormData(data), 'dhdfjhdjfh');
      // await savePricings(makeCustomFormData(data));
      toast.success("Pricings Updated");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Pricing Configuration</h1>

      <form onSubmit={handleSubmit(onSubmit)}>
        {sectionFields.length === 0
          ? <div className="text-center py-12">
            <p className="text-gray-500 mb-4">
              No pricing sections configured yet
            </p>
            <Button type="button" onClick={addSection}>
              Add Section
            </Button>
          </div>
          : <div className="space-y-8">
            {sectionFields.map((field, sectionIndex) => (
              <div key={field.id} className="border rounded-lg p-6 bg-card text-card-foreground">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Controller
                    name={`sections.${sectionIndex}.title`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-2">
                        <Label>Section Title</Label>
                        <Input
                          {...field}
                          placeholder="Enter section title"
                          className={fieldState.error ? "border-red-500" : ""}
                        />
                        {fieldState.error && (
                          <p className="text-xs text-red-500">{fieldState.error.message}</p>
                        )}
                      </div>
                    )}
                  />

                  <Controller
                    name={`sections.${sectionIndex}.subtitle`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <div className="flex flex-col gap-2">
                        <Label>Section Sub-title</Label>
                        <Input
                          {...field}
                          placeholder="Enter section sub-title"
                          className={fieldState.error ? "border-red-500" : ""}
                        />
                        {fieldState.error && (
                          <p className="text-xs text-red-500">{fieldState.error.message}</p>
                        )}
                      </div>
                    )}
                  />

                  <FileUpload
                    name={`sections.${sectionIndex}.icon`}
                    control={control}
                    label="Section Icon"
                    accept="image/*"
                    buttonText="Choose Image"
                    changeButtonText="Change"
                  />
                </div>

                <PropertyTypeSection
                  sectionIndex={sectionIndex}
                  control={control}
                />

                <div className="flex justify-end mt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSectionHandler(sectionIndex)}
                    disabled={sectionFields.length === 1}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    type="button"
                  >
                    Delete Section
                  </Button>
                </div>
              </div>
            ))}

            <div className="flex justify-center gap-4">
              <Button type="button" onClick={addSection}>
                Add Section
              </Button>
              <Button
                disabled={!isDirty || isSubmitting}
                className="bg-green-600 hover:bg-green-700 text-white"
                type="submit"
              >
                {isSubmitting ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </div>}
      </form>
    </div>
  );
}
