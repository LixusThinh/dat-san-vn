import Image from "next/image";

export function VenueGallery({
  name,
  images,
}: Readonly<{
  name: string;
  images: string[];
}>) {
  const [hero, ...rest] = images;
  const gallery = [hero, ...rest].filter(Boolean);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.5fr_0.9fr]">
      <div className="relative min-h-[320px] overflow-hidden rounded-[32px]">
        <Image src={gallery[0]} alt={name} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 66vw" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {gallery.slice(1, 3).map((image, index) => (
          <div key={`${image}-${index}`} className="relative min-h-[152px] overflow-hidden rounded-[28px]">
            <Image
              src={image}
              alt={`${name} - ảnh ${index + 2}`}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 50vw, 24vw"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
