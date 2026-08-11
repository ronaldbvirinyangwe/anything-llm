import React from "react";
import { Link } from "react-router-dom";
import PublicSiteShell from "@/components/PublicSiteShell";

const sections = [
  {
    heading: "1. What is APKPure and why does it matter?",
    body: [
      "APKPure is one of the most widely used alternative Android app stores in the world. It hosts APK files — the installation packages for Android apps — and allows users to download and install apps directly onto their phones, without needing the Google Play Store.",
      "For students in Zimbabwe, this matters a great deal. Not every Android phone comes with the Google Play Store pre-installed, and mobile data costs make large downloads expensive. APKPure offers a reliable, trusted mirror for apps that works on virtually any Android device.",
      "Chikoro AI is now listed on APKPure at apkpure.com/p/com.scaleszw.chikoroai. If you have been unable to access the app through other means, this is the easiest way to get it onto your phone today.",
    ],
  },
  {
    heading: "2. Which Android devices does the APK support?",
    body: [
      "The Chikoro AI APK is compatible with Android 8.0 (Oreo) and above. This covers the vast majority of smartphones currently in use across Zimbabwe, including low-cost handsets from Tecno, Itel, Infinix, Samsung, and Huawei.",
      "You do not need a flagship phone. Chikoro AI is designed to run well on everyday devices with modest hardware. The app has been tested on phones with as little as 2 GB of RAM.",
      "If you are unsure which version of Android your phone is running, go to Settings → About Phone → Android Version. As long as it reads 8.0 or higher, you can install the Chikoro AI APK without any issues.",
    ],
  },
  {
    heading: "3. How to download and install the APK safely",
    body: [
      "Installing an APK outside of the Google Play Store requires one extra step: you need to allow your phone to install apps from unknown sources. This setting is safe to enable for trusted stores like APKPure and can be turned off again afterwards.",
      "Step 1: On your phone, go to Settings → Security (or Privacy on some devices) and enable 'Install unknown apps' or 'Allow from this source'. On Android 8 and above, this permission is requested per-app, so your browser or file manager will ask for it when you run the APK.",
      "Step 2: Visit apkpure.com/p/com.scaleszw.chikoroai on your phone's browser and tap Download APK. Step 3: Once downloaded, open the file from your notifications or your Downloads folder and tap Install. Step 4: Open Chikoro AI, sign in or register, and start learning.",
    ],
  },
  {
    heading: "4. Is the APKPure version the same as the Play Store version?",
    body: [
      "Yes. The APK on APKPure is the same application as the version distributed through official app stores. It contains all the same features: AI-powered homework help, past paper explanations, support for English, Shona, and Ndebele, and alignment to the ZIMSEC and Cambridge syllabuses.",
      "APKPure mirrors the latest published version of the app. When a new version of Chikoro AI is released, the APKPure listing is updated to match. You can check the version number on the APKPure page and compare it to what is installed on your phone at any time.",
      "If you already have Chikoro AI installed from another source, you do not need to reinstall it from APKPure. APKPure is simply an additional download option for students who need it.",
    ],
  },
  {
    heading: "5. Why students without Google Play benefit most",
    body: [
      "A significant number of Android phones sold in Zimbabwe — particularly budget Huawei devices and Chinese-manufactured handsets — ship without Google Play Services. This means standard Play Store downloads simply do not work on these devices.",
      "APKPure solves this completely. The APK installs and runs independently of Google Play Services. A student with a Huawei Y6, a Tecno Spark, or any other non-Play device can install Chikoro AI in under two minutes using APKPure.",
      "This matters for ZIMSEC students in particular. Access to a 24/7 AI tutor should not depend on which phone brand your family could afford. APKPure removes that barrier.",
    ],
  },
  {
    heading: "6. Data usage and offline features",
    body: [
      "Chikoro AI requires an internet connection to generate AI responses — the AI processing happens in the cloud. However, the app is designed to be as data-light as possible. Text-based conversations with the AI use very little data, typically less than a standard web page.",
      "The app does not auto-play videos or load heavy media in the background. If you are on a data bundle, you are in control of how much you use. Shorter, focused questions to the AI use less data than long back-and-forth conversations.",
      "We recommend using Chikoro AI on Wi-Fi where available, but it works well on mobile data too. Students on EcoCash or NetOne data bundles have reported no issues using the app for daily study sessions.",
    ],
  },
  {
    heading: "7. Keeping the app up to date",
    body: [
      "Because you have installed the APK manually, your phone will not automatically update Chikoro AI the way it would with a Play Store app. To update, simply return to the APKPure listing, download the latest APK, and install it over your existing version. Your account and data will be preserved.",
      "APKPure also has its own app — the APKPure client — which can manage updates for all APKs you have installed through the platform. If you want automatic update notifications, installing the APKPure client is the easiest way to get them.",
      "We recommend updating whenever a new version is available. Updates bring new features, performance improvements, and fixes for any issues that have been reported by the community.",
    ],
  },
  {
    heading: "8. Getting help if the installation does not work",
    body: [
      "If the APK fails to install, the most common reason is that 'Install unknown apps' has not been enabled for your browser or file manager. Go back to your security settings and confirm the permission is granted for the app you are using to open the file.",
      "If you see an error saying 'App not installed' or 'Parse error', the download may have been incomplete or corrupted. Delete the downloaded file, clear your browser cache, and try downloading again from APKPure.",
      "For any other issues, contact Chikoro AI support through the website or use the in-app help feature once you are logged in. You can also ask Chikoro AI directly — type your installation question and the AI will walk you through it.",
    ],
  },
];

export default function ChikoroAIApkPure() {
  return (
    <PublicSiteShell>
      <article className="max-w-3xl mx-auto px-6 pt-12 pb-20">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-xs text-landing-text-muted">
          <Link
            to="/blog"
            className="transition-colors hover:text-landing-text"
          >
            Blog
          </Link>
          <span>/</span>
          <span className="text-landing-text">Chikoro AI APK on APKPure</span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className="rounded-full border border-landing-accent-border bg-landing-accent-soft px-3 py-1 text-xs font-semibold text-landing-accent">
            App Updates
          </span>
          <span className="text-xs text-landing-text-muted">14 March 2026</span>
          <span className="text-xs text-landing-text-muted">
            &bull; 5 min read
          </span>
        </div>

        {/* Title */}
        <h1 className="mb-6 text-3xl font-bold leading-tight text-landing-text md:text-4xl">
          Chikoro AI APK Is Now Available on APKPure
        </h1>

        {/* Intro */}
        <p className="mb-4 leading-relaxed text-landing-text-muted">
          Not every Zimbabwe student has access to the Google Play Store — and
          that should not stop anyone from getting AI-powered homework help. The
          Chikoro AI APK is now listed on APKPure, one of the world's most
          trusted alternative Android app stores, so you can install it on any
          Android phone in minutes.
        </p>
        <p className="mb-4 leading-relaxed text-landing-text-muted">
          Whether your phone does not have Google Play, you prefer to manage
          your own app installs, or you simply want a direct download link to
          share with a friend, this guide covers everything you need to know
          about getting Chikoro AI onto your Android device via APKPure.
        </p>

        {/* Quick tip box */}
        <div className="mb-10 rounded-xl border border-landing-accent-border bg-landing-accent-soft p-5">
          <p className="mb-1 text-sm font-semibold text-landing-accent">
            Direct download link
          </p>
          <p className="text-sm leading-relaxed text-landing-text-muted">
            The Chikoro AI APK is available at{" "}
            <a
              href="https://apkpure.com/p/com.scaleszw.chikoroai"
              target="_blank"
              rel="noopener noreferrer"
              className="text-landing-accent underline underline-offset-2 transition-colors hover:text-landing-accent-hover"
            >
              apkpure.com/p/com.scaleszw.chikoroai
            </a>
            . Compatible with Android 8.0 and above. Free to download.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {sections.map(({ heading, body }) => (
            <div key={heading}>
              <h2 className="mb-4 text-xl font-bold text-landing-text">
                {heading}
              </h2>
              <div className="space-y-3">
                {body.map((para, i) => (
                  <p
                    key={i}
                    className="text-sm leading-relaxed text-landing-text-muted"
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Compatibility table */}
        <div className="mb-10 mt-12 overflow-hidden rounded-xl border border-landing-border bg-landing-surface">
          <div className="border-b border-landing-border px-6 py-4">
            <h2 className="text-base font-bold text-landing-text">
              Android version compatibility
            </h2>
          </div>
          <div className="divide-y divide-landing-border">
            {[
              { version: "Android 14", status: "Full support", ok: true },
              { version: "Android 13", status: "Full support", ok: true },
              { version: "Android 12", status: "Full support", ok: true },
              { version: "Android 11", status: "Full support", ok: true },
              { version: "Android 10", status: "Full support", ok: true },
              { version: "Android 9 (Pie)", status: "Full support", ok: true },
              { version: "Android 8 (Oreo)", status: "Full support", ok: true },
              {
                version: "Android 7 and below",
                status: "Not supported",
                ok: false,
              },
            ].map(({ version, status, ok }) => (
              <div
                key={version}
                className="flex items-center justify-between px-6 py-3"
              >
                <span className="text-sm text-landing-text-muted">
                  {version}
                </span>
                <span
                  className={`text-sm font-semibold ${ok ? "text-landing-accent" : "text-landing-text-faint"}`}
                >
                  {status}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-landing-surface-subtle px-6 py-3">
            <p className="text-xs text-landing-text-faint">
              Check your Android version under Settings → About Phone → Android
              Version.
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-10">
          <h2 className="mb-4 text-xl font-bold text-landing-text">
            How to get the app right now
          </h2>
          <ul className="space-y-3">
            {[
              "Go to apkpure.com/p/com.scaleszw.chikoroai on your phone's browser",
              "Tap 'Download APK' and wait for the file to download",
              "Enable 'Install unknown apps' for your browser in your phone's security settings",
              "Open the downloaded APK file and tap Install",
              "Sign in or register for free and start asking questions",
            ].map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-landing-text-muted"
              >
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-landing-accent-soft text-xs font-bold text-landing-accent">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* CTA */}
        <div className="rounded-2xl border border-landing-accent-border bg-landing-accent-soft p-8 text-center">
          <h2 className="mb-3 text-xl font-bold text-landing-text">
            Zimbabwe's AI tutor — now on any Android phone
          </h2>
          <p className="mx-auto mb-6 max-w-md text-sm text-landing-text-muted">
            Ask any ZIMSEC or Cambridge question and get a step-by-step
            explanation in English, Shona, or Ndebele. Upload a past paper or
            worksheet and get it solved instantly — 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://apkpure.com/p/com.scaleszw.chikoroai"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-landing-accent px-8 py-3 text-sm font-bold text-landing-accent-foreground transition-colors hover:bg-landing-accent-hover"
            >
              Download APK from APKPure
            </a>
            <Link
              to="/register"
              className="rounded-xl border border-landing-border-strong px-8 py-3 text-sm font-semibold text-landing-text transition-colors hover:border-landing-accent"
            >
              Sign up free on web
            </Link>
          </div>
        </div>
      </article>
    </PublicSiteShell>
  );
}
