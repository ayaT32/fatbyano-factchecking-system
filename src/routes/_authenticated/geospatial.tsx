import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useRef, useState } from "react";
import { Loader2, MapPin, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCopy } from "@/components/desk-ui";
import { lookupAddress, verifyImageLocation } from "@/lib/factcheck.functions";
import { pageMeta } from "@/lib/desk";

export const Route = createFileRoute("/_authenticated/geospatial")({
  head: () =>
    pageMeta(
      "Geospatial tools",
      "Check image locations and look up addresses at the Fattabyno verification desk.",
    ),
  component: GeospatialPage,
});

function GeospatialPage() {
  const c = useCopy();
  const verify = useServerFn(verifyImageLocation);
  const geocode = useServerFn(lookupAddress);
  const upload = useRef<HTMLInputElement>(null);
  const [imageBase64, setImageBase64] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageResult, setImageResult] = useState<unknown>(null);
  const [address, setAddress] = useState("");
  const [addressResult, setAddressResult] = useState<unknown>(null);
  const [imageBusy, setImageBusy] = useState(false);
  const [addressBusy, setAddressBusy] = useState(false);
  const [imageError, setImageError] = useState("");
  const [addressError, setAddressError] = useState("");

  async function chooseImage(file?: File) {
    if (!file) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setImageError(
        c(
          "اختر صورة PNG أو JPG أو WebP لا تتجاوز 5 ميغابايت.",
          "Choose a PNG, JPG, or WebP image under 5 MB.",
        ),
      );
      return;
    }
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the selected image."));
        reader.readAsDataURL(file);
      });
      setImageBase64(dataUrl.split(",")[1] ?? "");
      setImageName(file.name);
      setImageError("");
      setImageResult(null);
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : c("تعذر قراءة الصورة", "Could not read the image."),
      );
    }
  }

  async function submitImage(event: React.FormEvent) {
    event.preventDefault();
    if (!imageBase64 || imageBusy) return;
    setImageBusy(true);
    setImageError("");
    setImageResult(null);
    try {
      setImageResult(await verify({ data: { imageBase64 } }));
    } catch (error) {
      setImageError(
        error instanceof Error
          ? error.message
          : c("تعذر تحليل موقع الصورة", "Image location analysis failed."),
      );
    } finally {
      setImageBusy(false);
    }
  }

  async function submitAddress(event: React.FormEvent) {
    event.preventDefault();
    if (!address.trim() || addressBusy) return;
    setAddressBusy(true);
    setAddressError("");
    setAddressResult(null);
    try {
      setAddressResult(await geocode({ data: { address: address.trim() } }));
    } catch (error) {
      setAddressError(
        error instanceof Error
          ? error.message
          : c("تعذر البحث عن العنوان", "Address lookup failed."),
      );
    } finally {
      setAddressBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow={c("أدوات التحقق", "VERIFICATION TOOLS")}
        title={c("التحقق الجغرافي", "Geospatial tools")}
      />
      <div className="grid gap-8 lg:grid-cols-2">
        <section className="sheet space-y-5 border-t-4 border-primary p-6">
          <div className="flex items-center gap-3">
            <MapPin className="size-6 text-primary" />
            <h2 className="text-xl font-semibold">
              {c("تحليل موقع صورة", "Image location analysis")}
            </h2>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {c(
              "ارفع صورة لتحليل موقعها الجغرافي.",
              "Upload an image to analyze its geographic location.",
            )}
          </p>
          <form onSubmit={submitImage} className="space-y-4">
            <input
              ref={upload}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void chooseImage(event.target.files?.[0])}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => upload.current?.click()}
              disabled={imageBusy}
            >
              {c("اختيار صورة", "Choose image")}
            </Button>
            {imageName && <p className="text-sm text-muted-foreground">{imageName}</p>}
            <p className="text-xs text-muted-foreground">PNG · JPG · WebP · 5 MB</p>
            {imageError && (
              <p role="alert" className="break-words text-sm text-destructive">
                {imageError}
              </p>
            )}
            <Button type="submit" disabled={!imageBase64 || imageBusy}>
              {imageBusy ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <MapPin />
              )}
              {imageBusy ? c("جارٍ التحليل…", "Analyzing…") : c("تحليل الموقع", "Analyze location")}
            </Button>
          </form>
          {imageResult !== null && <ResultOutput value={imageResult} />}
        </section>

        <section className="sheet space-y-5 border-t-4 border-primary p-6">
          <div className="flex items-center gap-3">
            <Search className="size-6 text-primary" />
            <h2 className="text-xl font-semibold">{c("البحث عن عنوان", "Address lookup")}</h2>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            {c(
              "أدخل عنواناً للحصول على معلومات الموقع الجغرافي.",
              "Enter an address to retrieve its geographic location.",
            )}
          </p>
          <form onSubmit={submitAddress} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="geospatial-address">{c("العنوان", "Address")}</Label>
              <Input
                id="geospatial-address"
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                maxLength={1000}
                required
                disabled={addressBusy}
              />
            </div>
            {addressError && (
              <p role="alert" className="break-words text-sm text-destructive">
                {addressError}
              </p>
            )}
            <Button type="submit" disabled={!address.trim() || addressBusy}>
              {addressBusy ? (
                <Loader2 className="animate-spin motion-reduce:animate-none" />
              ) : (
                <Search />
              )}
              {addressBusy ? c("جارٍ البحث…", "Looking up…") : c("بحث", "Look up address")}
            </Button>
          </form>
          {addressResult !== null && <ResultOutput value={addressResult} />}
        </section>
      </div>
    </div>
  );
}

function ResultOutput({ value }: { value: unknown }) {
  return (
    <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-4 text-xs leading-5">
      {JSON.stringify(value, null, 2) ?? String(value)}
    </pre>
  );
}
