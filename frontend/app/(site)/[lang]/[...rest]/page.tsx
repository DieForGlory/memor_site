import { notFound } from "next/navigation";

// Любой неизвестный адрес внутри языка показывает 404 в оформлении сайта.
export default function CatchAll() {
  notFound();
}
