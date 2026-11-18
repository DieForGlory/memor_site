import Script from "next/script";

/** Счётчики подключаются, только если ID заданы в админке (Интеграции). */
export function Analytics({ metrikaId, gaId }: { metrikaId?: string; gaId?: string }) {
  // ID попадают в inline-скрипт, поэтому пропускаем только ожидаемый формат.
  const ym = metrikaId && /^\d{5,12}$/.test(metrikaId) ? metrikaId : "";
  const ga = gaId && /^G-[A-Z0-9]{4,16}$/.test(gaId) ? gaId : "";
  return (
    <>
      {ym && (
        <Script id="ym" strategy="afterInteractive">
          {`(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};m[i].l=1*new Date();
for (var j=0;j<document.scripts.length;j++){if(document.scripts[j].src===r){return;}}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window,document,"script","https://mc.yandex.ru/metrika/tag.js","ym");
ym(${ym},"init",{clickmap:true,trackLinks:true,accurateTrackBounce:true,webvisor:false});`}
        </Script>
      )}
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}
          </Script>
        </>
      )}
    </>
  );
}
