"use client";
import { use } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  addToast,
} from "@heroui/react";
import FileUpload from "@/components/FileUpload";
// import { savePricings } from '@/lib/actions/dynamicConfig';
import { makeCustomFormData } from "@/lib/helpers/customFormData";

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
      <Table aria-label="Property types pricing table">
        <TableHeader>
          <TableColumn>Property Type</TableColumn>
          <TableColumn>Photo</TableColumn>
          <TableColumn>Video</TableColumn>
          <TableColumn>Combined</TableColumn>
          <TableColumn>Actions</TableColumn>
        </TableHeader>
        <TableBody emptyContent="No property types added yet">
          {propertyFields.map((field, propertyIndex) => (
            <TableRow key={field.id}>
              <TableCell>
                <Controller
                  name={`sections.${sectionIndex}.propertyTypes.${propertyIndex}.propertyType`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      placeholder="Property type"
                      variant="bordered"
                      size="sm"
                      isRequired
                      errorMessage={fieldState.error?.message}
                    />
                  )}
                />
              </TableCell>
              <TableCell>
                <Controller
                  name={`sections.${sectionIndex}.propertyTypes.${propertyIndex}.photo`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      placeholder="Price"
                      variant="bordered"
                      size="sm"
                      type="number"
                      isRequired
                      errorMessage={fieldState.error?.message}
                    />
                  )}
                />
              </TableCell>
              <TableCell>
                <Controller
                  name={`sections.${sectionIndex}.propertyTypes.${propertyIndex}.video`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      placeholder="Price"
                      variant="bordered"
                      size="sm"
                      type="number"
                      isRequired
                      errorMessage={fieldState.error?.message}
                    />
                  )}
                />
              </TableCell>
              <TableCell>
                <Controller
                  name={`sections.${sectionIndex}.propertyTypes.${propertyIndex}.combined`}
                  control={control}
                  render={({ field, fieldState }) => (
                    <Input
                      {...field}
                      placeholder="Price"
                      variant="bordered"
                      size="sm"
                      type="number"
                      isRequired
                      errorMessage={fieldState.error?.message}
                    />
                  )}
                />
              </TableCell>
              <TableCell>
                <Button
                  color="danger"
                  variant="light"
                  size="sm"
                  onPress={() => removePropertyType(propertyIndex)}
                  isDisabled={propertyFields.length === 1}
                >
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="mt-4">
        <Button
          color="secondary"
          variant="light"
          type="button"
          onPress={addPropertyType}
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
      addToast({ title: "Pricings Updated", color: "success" });
    } catch (error) {
      addToast({ title: error.message, color: "danger" });
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
              <Button color="primary" type="button" onPress={addSection}>
                Add Section
              </Button>
            </div>
          : <div className="space-y-8">
              {sectionFields.map((field, sectionIndex) => (
                <div key={field.id} className="border rounded-lg p-6 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Controller
                      name={`sections.${sectionIndex}.title`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <Input
                          {...field}
                          label="Section Title"
                          placeholder="Enter section title"
                          variant="bordered"
                          isRequired
                          errorMessage={fieldState.error?.message}
                        />
                      )}
                    />

                    <Controller
                      name={`sections.${sectionIndex}.subtitle`}
                      control={control}
                      render={({ field, fieldState }) => (
                        <Input
                          {...field}
                          label="Section Sub-title"
                          placeholder="Enter section sub-title"
                          variant="bordered"
                          errorMessage={fieldState.error?.message}
                        />
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
                      color="danger"
                      variant="light"
                      size="sm"
                      onPress={() => removeSectionHandler(sectionIndex)}
                      isDisabled={sectionFields.length === 1}
                    >
                      Delete Section
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex justify-center gap-4">
                <Button color="primary" type="button" onPress={addSection}>
                  Add Section
                </Button>
                <Button
                  isDisabled={!isDirty}
                  color="success"
                  isLoading={isSubmitting}
                  type="submit"
                >
                  Save Configuration
                </Button>
              </div>
            </div>}
      </form>
    </div>
  );
}
