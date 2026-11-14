"use client";

import { type ChangeEvent, useState } from "react";
import type { Area, Point } from "react-easy-crop";

/*
 *   The item image picker with cropping, shared by the create and edit
 *   item pages.
 *
 *   image         = the cropped File to upload (null until "Done")
 *   selectedImage = the uncropped File the user picked (uploaded as the original)
 *   imagePreview  = what the page shows: the crop, or the saved image URL
 **/
export function useItemImage() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [originalImageSrc, setOriginalImageSrc] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [errorMessageImage, setErrorMessageImage] = useState<string | null>(
    null,
  );

  function revokeBlobUrls() {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    if (cropImageSrc?.startsWith("blob:")) URL.revokeObjectURL(cropImageSrc);

    if (
      originalImageSrc?.startsWith("blob:") &&
      originalImageSrc !== cropImageSrc
    ) {
      URL.revokeObjectURL(originalImageSrc);
    }
  }

  /*
   * A file was picked: open the cropper. savedPreview is what to show
   * until the crop is done (the item's current image, or nothing).
   */
  function handleImageChange(
    event: ChangeEvent<HTMLInputElement>,
    savedPreview: string | null = null,
  ) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    revokeBlobUrls();

    const imageUrl = URL.createObjectURL(selectedFile);

    setImage(null);
    setImagePreview(savedPreview);
    setSelectedImage(selectedFile);
    setOriginalImageSrc(imageUrl);
    setCropImageSrc(imageUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setErrorMessageImage(null);
  }

  function handleCropComplete(_croppedArea: Area, areaPixels: Area) {
    setCroppedAreaPixels(areaPixels);
  }

  async function handleUseCrop() {
    if (!cropImageSrc || !croppedAreaPixels) return;

    try {
      const croppedImage = await createCroppedImage(
        cropImageSrc,
        croppedAreaPixels,
        selectedImage,
      );

      if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);

      setImage(croppedImage);
      setImagePreview(URL.createObjectURL(croppedImage));
      setCropImageSrc(null);
      setErrorMessageImage(null);
    } catch (error) {
      console.error("Error cropping item image:", error);
      setErrorMessageImage(
        "Something went wrong while cropping the item image.",
      );
    }
  }

  function handleEditCrop() {
    if (originalImageSrc) setCropImageSrc(originalImageSrc);
  }

  /*
   * Show the item's saved image (after loading or saving) and forget any
   * picked file. keepOriginal keeps the picked file's original for re-cropping.
   */
  function showSavedImage(
    imageKey: string | null,
    originalImageKey: string | null,
    keepOriginal = false,
  ) {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);

    setImage(null);
    setSelectedImage(null);
    setCropImageSrc(null);
    setCroppedAreaPixels(null);
    setImagePreview(imageKey);

    if (!keepOriginal) {
      if (originalImageSrc?.startsWith("blob:")) {
        URL.revokeObjectURL(originalImageSrc);
      }

      setOriginalImageSrc(originalImageKey ?? imageKey);
    }
  }

  // No image at all (after deleting it, or resetting the create form).
  function clearImage() {
    revokeBlobUrls();

    setImage(null);
    setImagePreview(null);
    setSelectedImage(null);
    setOriginalImageSrc(null);
    setCropImageSrc(null);
    setCroppedAreaPixels(null);
    setErrorMessageImage(null);
  }

  return {
    image,
    selectedImage,
    imagePreview,
    cropImageSrc,
    crop,
    zoom,
    croppedAreaPixels,
    errorMessageImage,
    setCrop,
    setZoom,
    handleImageChange,
    handleCropComplete,
    handleUseCrop,
    handleEditCrop,
    showSavedImage,
    clearImage,
  };
}

// Draws the crop onto a canvas at its real pixel size (no fixed size).
async function createCroppedImage(
  imageSrc: string,
  cropArea: Area,
  originalFile: File | null,
): Promise<File> {
  const sourceImage = document.createElement("img");

  sourceImage.crossOrigin = "anonymous";
  sourceImage.src = imageSrc;

  await new Promise<void>((resolve, reject) => {
    sourceImage.onload = () => resolve();
    sourceImage.onerror = () => reject(new Error("Failed to load image."));
  });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) throw new Error("Could not create image canvas.");

  canvas.width = cropArea.width;
  canvas.height = cropArea.height;

  context.drawImage(
    sourceImage,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    cropArea.width,
    cropArea.height,
  );

  const imageType = originalFile?.type ?? "image/webp";

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (result) =>
        result ? resolve(result) : reject(new Error("Failed to crop image.")),
      imageType,
      0.95,
    );
  });

  return new File([blob], originalFile?.name ?? "item-image.webp", {
    type: imageType,
  });
}
