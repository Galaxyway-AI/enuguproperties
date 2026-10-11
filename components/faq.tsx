import Link from "next/link";
import { ChevronDown, ArrowUpRight } from "lucide-react";
import { faqItems, type FaqItem } from "@/lib/faq";
import "./trust-content.css";

export function Faq({ items = faqItems }: { items?: FaqItem[] }) {
  return (
    <div className="visitor-faq">
      {items.map((item) => (
        <details className="visitor-faq-item" key={item.id} id={item.id}>
          <summary>
            <span>{item.question}</span>
            <ChevronDown size={20} aria-hidden="true" />
          </summary>
          <div className="visitor-faq-answer">
            <p>{item.answer}</p>
            {item.link && (
              <Link className="text-link" href={item.link.href}>
                {item.link.label} <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
