"use client";

import Link from "next/link";
import { useI18n } from "@/i18n/context";

function Slide({ title, points }: { title: string; points: string[] }) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-lg font-bold text-zinc-900">{title}</h2>
      <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-zinc-700 sm:text-[0.95rem]">
        {points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
    </section>
  );
}

export default function SalesDeckPage() {
  const { locale } = useI18n();
  const isTr = locale === "tr";

  const labels = isTr
    ? {
        title: "POC Satış Sunumu",
        lead: "20-30 dakikalık müşteri görüşmesi için kısa sunum akışı.",
        backGuide: "Nasıl kullanırım sayfasına dön",
        ctaTitle: "Toplantı Sonu Karar Seti",
        cta: [
          "Pilot şube sayısı",
          "POC süresi (4-6 hafta)",
          "Başarı kriterlerinin onayı",
          "Müşteri tarafı sorumlu kişiler",
        ],
      }
    : {
        title: "POC Sales Deck",
        lead: "Compact flow for a 20-30 minute customer meeting.",
        backGuide: "Back to How to use page",
        ctaTitle: "Meeting Exit Decisions",
        cta: [
          "Pilot branch count",
          "POC duration (4-6 weeks)",
          "Success criteria sign-off",
          "Customer-side owners",
        ],
      };

  const slides = isTr
    ? [
        {
          title: "1) Problem",
          points: [
            "Kasa, stok, personel ve tedarik verileri farklı araçlarda dağınık.",
            "Gün sonu doğruluk düşük, merkez görünürlüğü zayıf.",
            "Yönetim kararları gecikmeli ve manuel raporla alınıyor.",
          ],
        },
        {
          title: "2) Çözüm",
          points: [
            "Şube, depo, personel ve rapor verisini tek platformda topluyoruz.",
            "Operasyon akışını finansal görünürlükle eşliyoruz.",
            "Yetki ve audit ile kontrol edilebilir bir yapı kuruyoruz.",
          ],
        },
        {
          title: "3) POC Kapsamı",
          points: [
            "Şube gelir/gider kaydı",
            "Depo giriş/çıkış ve şubeye transfer",
            "Personel avans/maaş temel akışı",
            "Finans + stok + nakit raporları",
          ],
        },
        {
          title: "4) Başarı Kriterleri",
          points: [
            "Yönetici günlük net durumu tek ekranda görebilir.",
            "Depodan şubeye hareket uçtan uca izlenebilir.",
            "En az 3 ana rapor canlı veriyle çalışır.",
            "Rol bazlı yetki farkı net gösterilir.",
          ],
        },
      ]
    : [
        {
          title: "1) Problem",
          points: [
            "Cash, stock, personnel, and procurement data are fragmented.",
            "Day-end confidence is low and HQ visibility is limited.",
            "Management decisions depend on delayed manual reporting.",
          ],
        },
        {
          title: "2) Solution",
          points: [
            "Unify branch, warehouse, personnel, and reporting in one platform.",
            "Connect operational execution to financial visibility.",
            "Add role-based control and auditable workflows.",
          ],
        },
        {
          title: "3) POC Scope",
          points: [
            "Branch income/expense posting",
            "Warehouse in/out and branch transfer",
            "Core personnel advance/salary flow",
            "Finance + stock + cash reports",
          ],
        },
        {
          title: "4) Success Criteria",
          points: [
            "Management can view daily net in one screen.",
            "Warehouse-to-branch movement is fully traceable.",
            "At least 3 key reports run on live data.",
            "Role differences are clearly demonstrated.",
          ],
        },
      ];

  return (
    <div className="w-full min-w-0 space-y-5 px-4 pb-24 pt-4 sm:space-y-6 sm:px-6 sm:pb-10 sm:pt-6 md:py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
          {labels.title}
        </h1>
        <p className="text-sm text-zinc-600 sm:text-base">{labels.lead}</p>
        <Link
          href="/guide"
          className="inline-flex items-center rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
        >
          {labels.backGuide}
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        {slides.map((slide) => (
          <Slide key={slide.title} title={slide.title} points={slide.points} />
        ))}
      </div>

      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 sm:p-5">
        <h2 className="text-base font-bold text-violet-950 sm:text-lg">{labels.ctaTitle}</h2>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-violet-900 sm:text-[0.95rem]">
          {labels.cta.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
