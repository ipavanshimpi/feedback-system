import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend
} from "recharts";
import {
  ArrowLeft,
  Calendar,
  Share2,
  Copy,
  Check,
  FileDown,
  MessageSquareCode,
  Users,
  LineChart,
  Shield,
  Activity,
  Trash2
} from "lucide-react";
import { CampaignAnalytics } from "../types";

interface CampaignReportProps {
  id: string;
  onBack: () => void;
}

export function CampaignReport({ id, onBack }: CampaignReportProps) {
  const [data, setData] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const studentFormUrl = `${window.location.origin}/f/${id}`;

  const handleDeleteCampaign = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this feedback campaign and all its responses? This action cannot be undone.")) {
      return;
    }
    try {
      const response = await fetch(`/api/campaigns/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        throw new Error("Failed to delete campaign");
      }
      onBack();
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to delete campaign");
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/campaigns/${id}/analytics`);
      if (!response.ok) {
        throw new Error("Failed to load campaign analytics");
      }
      const val = await response.json();
      setData(val);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while fetching reports.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [id]);

  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(studentFormUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  let handleDownloadPdf = async () => {};

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center space-y-4">
        <div className="w-8 h-8 border-2 border-neutral-300 border-t-teal-600 rounded-full animate-spin"></div>
        <p className="text-neutral-500 font-mono text-xs tracking-widest">COMPILE REPORT PIPELINES...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="ambient-card rounded-3xl p-8 text-center space-y-4 max-w-md mx-auto">
        <p className="text-red-500 text-sm font-semibold">{error || "Failed to load report."}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-neutral-800 border border-neutral-200 py-2 px-4 rounded-xl hover:bg-neutral-50 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Grid</span>
        </button>
      </div>
    );
  }

  const { campaign, totalResponses, averages, suggestions } = data;

  const barChartData = averages.map((av, idx) => ({
    name: `Q${idx + 1}`,
    score: av.average,
    fullName: av.question,
    distribution: av.distribution
  }));

  const overallSum = averages.reduce((acc, curr) => acc + curr.average, 0);
  const overallAverage = averages.length > 0 ? parseFloat((overallSum / averages.length).toFixed(2)) : 0;

  const combinedDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  averages.forEach((av) => {
    combinedDistribution[1] += av.distribution[1];
    combinedDistribution[2] += av.distribution[2];
    combinedDistribution[3] += av.distribution[3];
    combinedDistribution[4] += av.distribution[4];
    combinedDistribution[5] += av.distribution[5];
  });

  const pieChartData = [
    { name: "5★ Excellent", value: combinedDistribution[5], color: "#1e50ff" }, // Brand Blue
    { name: "4★ Very Good", value: combinedDistribution[4], color: "#1e293b" }, // Charcoal Dark slate
    { name: "3★ Good", value: combinedDistribution[3], color: "#475569" }, // Medium slate
    { name: "2★ Fair", value: combinedDistribution[2], color: "#64748b" }, // Soft slate
    { name: "1★ Poor", value: combinedDistribution[1], color: "#94a3b8" }, // Light silver slate
  ].filter(item => item.value > 0);

  const generateDirectVectorPdf = () => {
    const pdf = new jsPDF("p", "mm", "a4");

    // Set meta details
    pdf.setProperties({
      title: `simplesphere Report - ${campaign.title}`,
      subject: 'Course Evaluation Executive Summary',
      author: 'simplesphere feedback engine',
      creator: 'simplesphere'
    });

    let currentY = 25;

    const checkPageBoundary = (neededHeight: number) => {
      if (currentY + neededHeight > 270) {
        pdf.addPage();
        currentY = 25;
        // Draw a subtle line & small header on the new page
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`simplesphere Report | ${campaign.title}`, 20, 15);
        pdf.setDrawColor(229, 231, 235);
        pdf.line(20, 17, 190, 17);
      }
    };

    // Header - Zoomed in "simplesphere COURSE EVALUATION CO-PILOT" in electric blue
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(30, 80, 255); // Brand Electric Blue
    pdf.text("simplesphere COURSE EVALUATION CO-PILOT", 20, currentY - 1);

    // Export Date (Right-aligned)
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(156, 163, 175);
    pdf.text(`EXPORTED ON: ${new Date().toLocaleDateString()}`, 190, currentY - 1, { align: "right" });

    currentY += 12;

    // Title
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(22);
    pdf.setTextColor(17, 24, 39);
    const splitTitle = pdf.splitTextToSize(campaign.title, 170);
    pdf.text(splitTitle, 20, currentY);
    currentY += (splitTitle.length * 8) + 4;

    // Subtitle
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.setTextColor(107, 114, 128);
    pdf.text("Executive Course Evaluation & Performance Analytics Metrics Summary", 20, currentY);
    currentY += 10;

    // Divider
    pdf.setDrawColor(229, 231, 235);
    pdf.line(20, currentY, 190, currentY);
    currentY += 12;

    // KPI Dash Boxes
    // Total Response card
    pdf.setFillColor(249, 250, 251);
    pdf.rect(20, currentY, 80, 22, "F");
    pdf.setDrawColor(243, 244, 246);
    pdf.rect(20, currentY, 80, 22, "D");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(156, 163, 175);
    pdf.text("TOTAL EVALUATIONS SUBMITTED", 25, currentY + 7);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(17, 24, 39);
    pdf.text(`${totalResponses}`, 25, currentY + 16);

    // Cumulative card
    pdf.setFillColor(249, 250, 251);
    pdf.rect(110, currentY, 80, 22, "F");
    pdf.rect(110, currentY, 80, 22, "D");

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(8);
    pdf.setTextColor(156, 163, 175);
    pdf.text("CUMULATIVE AVERAGE SCORE", 115, currentY + 7);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(30, 80, 255); // Brand Electric Blue
    pdf.text(`${overallAverage > 0 ? overallAverage : "0.0"} / 5.0 Stars`, 115, currentY + 16);

    currentY += 34;

    // Metric Breakdown Header
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(17, 24, 39);
    pdf.text("QUANTITATIVE PERFORMANCE METRICS INDEX", 20, currentY);
    currentY += 8;

    // Section divider line
    pdf.setDrawColor(243, 244, 246);
    pdf.line(20, currentY, 190, currentY);
    currentY += 8;

    const wrapText = (text: string, maxChars: number): string[] => {
      const words = text.split(" ");
      const lines: string[] = [];
      let currentLine = "";

      words.forEach((word) => {
        if ((currentLine + " " + word).trim().length <= maxChars) {
          currentLine = currentLine ? currentLine + " " + word : word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      });
      if (currentLine) {
        lines.push(currentLine);
      }
      return lines;
    };

    // List Metrics
    averages.forEach((av, idx) => {
      // Clean custom word wrapping to max 65 characters to guarantee no overlap with score on right side
      const questionLines = wrapText(`${idx + 1}. ${av.question}`, 65);
      const neededHeight = (questionLines.length * 5) + 14;

      checkPageBoundary(neededHeight);

      // Render Metric identifier
      pdf.setFillColor(15, 23, 42); // Deep Charcoal
      pdf.rect(20, currentY, 10, 5, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(7);
      pdf.setTextColor(96, 165, 250); // Light Blue Text
      pdf.text(`M${(idx+1).toString().padStart(2, '0')}`, 21.5, currentY + 3.8);

      // Render Question Text
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.setTextColor(55, 65, 81);
      pdf.text(questionLines, 34, currentY + 4);

      // Score layout (right-aligned)
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(17, 24, 39);
      const scoreStr = av.average.toFixed(2);
      pdf.text(scoreStr, 190, currentY + 4, { align: "right" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      pdf.text("STARS", 190, currentY + 8, { align: "right" });

      // Render Horizontal Visual Rating Bar underneath question lines
      const barY = currentY + (questionLines.length * 5) + 2;
      pdf.setFillColor(243, 244, 246);
      pdf.rect(34, barY, 80, 2.5, "F");
      // Filled bar in Electric Brand Blue
      pdf.setFillColor(30, 80, 255);
      pdf.rect(34, barY, (av.average / 5) * 80, 2.5, "F");

      // Add distribution summary text next to bar - replacing raw ★ to avoid broken PDF symbols
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(7.5);
      pdf.setTextColor(156, 163, 175);
      const distText = `Weight: 5* (${av.distribution[5] || 0})  4* (${av.distribution[4] || 0})  3* (${av.distribution[3] || 0})  2* (${av.distribution[2] || 0})  1* (${av.distribution[1] || 0})`;
      pdf.text(distText, 120, barY + 2);

      currentY += neededHeight;
    });

    currentY += 10;

    // Reviews/Commentary
    checkPageBoundary(25);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(17, 24, 39);
    pdf.text(`TRANSPARENT REVIEWS COMMENTARY (${suggestions.length})`, 20, currentY);
    currentY += 8;

    pdf.setDrawColor(243, 244, 246);
    pdf.line(20, currentY, 190, currentY);
    currentY += 8;

    if (suggestions.length === 0) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(9);
      pdf.setTextColor(156, 163, 175);
      pdf.text("No student recommendations recorded for this campaign.", 20, currentY);
    } else {
      suggestions.forEach((sug) => {
        // Wrap suggestions to 95 characters for perfect boxed presentation
        const wrappedText = wrapText(sug.text, 95);
        const neededHeight = (wrappedText.length * 4.5) + 16;

        checkPageBoundary(neededHeight);

        // Comment Box background
        pdf.setFillColor(249, 250, 251);
        pdf.rect(20, currentY, 170, neededHeight - 4, "F");
        // Clean left blue boundary line
        pdf.setFillColor(30, 80, 255);
        pdf.rect(20, currentY, 1.2, neededHeight - 4, "F");

        // Comment content
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8.5);
        pdf.setTextColor(55, 65, 81);
        pdf.text(wrappedText, 25, currentY + 5);

        // Metadata footer about response
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(7);
        pdf.setTextColor(156, 163, 175);
        pdf.text("IDENTITY SHIELD ENCRYPTED RESPONSE PIN", 25, currentY + neededHeight - 7);

        const datStr = new Date(sug.created_at).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric"
        });
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(7.5);
        pdf.text(datStr, 185, currentY + neededHeight - 7, { align: "right" });

        currentY += neededHeight;
      });
    }

    // Footer on final page
    checkPageBoundary(15);
    pdf.setDrawColor(229, 231, 235);
    pdf.line(20, currentY + 2, 190, currentY + 2);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7.5);
    pdf.setTextColor(156, 163, 175);
    pdf.text("SIMPLESPHERE ENGINE • EXCELLENCE EVALUATION STANDARD", 20, currentY + 7);
    pdf.text("100% SECURED STUDENT RECORDS", 190, currentY + 7, { align: "right" });

    const fileSafeTitle = campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "report";
    pdf.save(`simplesphere_Report_${fileSafeTitle}.pdf`);
  };

  handleDownloadPdf = async () => {
    const element = document.getElementById("analytics-report-view");
    if (!element) return;
    setExporting(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 300));
      // First try standard html2canvas image representation
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const fileSafeTitle = data?.campaign.title.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "report";
      pdf.save(`simplesphere_Report_${fileSafeTitle}.pdf`);
    } catch (err: any) {
      console.warn("HTML2Canvas PDF compilation bypassed/failed, executing robust native vector fallback PDF:", err);
      // Execute the high-fidelity direct vector generator
      try {
        generateDirectVectorPdf();
      } catch (vectorErr) {
        console.error("Vector backup PDF generation failed:", vectorErr);
        alert("Failed to export PDF. Please check your browser capabilities.");
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top action header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-100 pb-5">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 py-2 px-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-800 transition active:scale-[0.98] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-neutral-500" />
          <span>Back to Console</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDeleteCampaign}
            className="py-2 px-4 rounded-xl border border-red-200 hover:border-red-300 hover:bg-red-50 text-xs font-semibold text-red-650 transition active:scale-[0.98] cursor-pointer font-mono text-[11px] inline-flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>DELETE CAMPAIGN</span>
          </button>
          <button
            onClick={fetchAnalytics}
            className="py-2 px-4 rounded-xl border border-neutral-200 hover:bg-neutral-50 text-xs font-semibold text-neutral-800 transition active:scale-[0.98] cursor-pointer font-mono text-[11px]"
          >
            REFRESH DATA
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={totalResponses === 0 || exporting}
            className={`inline-flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-semibold transition active:scale-[0.98] cursor-pointer border ${
              totalResponses === 0
                ? "bg-neutral-100 text-neutral-400 border-neutral-200 cursor-not-allowed"
                : "bg-teal-650 border-teal-650 text-white hover:bg-teal-700 shadow-sm shadow-teal-500/10 hover:shadow-md hover:shadow-teal-500/20"
            }`}
          >
            <FileDown className="w-4 h-4" />
            <span>{exporting ? "Compiling PDF..." : "Download Executive Summary"}</span>
          </button>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side Panel: Ingress Portal information */}
        <div className="lg:col-span-4 space-y-6">
          <div className="ambient-card rounded-3xl p-6 sm:p-8 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold bg-neutral-50 border border-neutral-200 text-neutral-600 font-mono mb-4">
                <span className="w-1.5 h-1.5 bg-teal-600 rounded-full animate-ping"></span>
                LIVE PROGRAM CAPTURE
              </div>
              <h2 className="text-xl font-bold text-neutral-900 leading-tight">
                {campaign.title}
              </h2>
              <div className="mt-3.5 flex items-center gap-2 text-xs text-neutral-400 font-mono">
                <Calendar className="w-3.5 h-3.5 text-neutral-300" />
                <span>
                  Activated {new Date(campaign.created_at).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </span>
              </div>
            </div>

            {/* Quick Metrics KPI highlights */}
            <div className="grid grid-cols-2 gap-4 border-t border-neutral-100 pt-5 font-mono">
              <div className="bg-neutral-50/70 p-4 rounded-2xl border border-neutral-100/60">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">TOTAL VOTE</span>
                <span className="text-2xl font-black text-neutral-900 leading-none">
                  {totalResponses}
                </span>
              </div>
              <div className="bg-neutral-50/70 p-4 rounded-2xl border border-neutral-100/60">
                <span className="text-[9px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1">CUMULATIVE</span>
                <span className="text-2xl font-black text-neutral-900 leading-none text-teal-650">
                  {overallAverage > 0 ? `${overallAverage}` : "0.0"}
                </span>
              </div>
            </div>
          </div>

          {/* Student QR Portal Box */}
          <div className="ambient-card rounded-3xl p-6 sm:p-8 flex flex-col items-center text-center space-y-5">
            <div className="space-y-1.5">
              <h4 className="text-[10px] font-bold text-neutral-400 font-mono uppercase tracking-widest leading-none">
                Identity-Shielded Portal
              </h4>
              <p className="text-xs text-neutral-500 leading-relaxed max-w-xs">
                Students submit evaluations anonymously. Present this QR or share the ingress URL during classes.
              </p>
            </div>

            <div className="p-4 bg-white border border-neutral-150 rounded-2xl shadow-xs relative block select-none">
              <QRCodeSVG value={studentFormUrl} size={150} level="M" includeMargin={false} />
            </div>
            
            <div className="space-y-4 w-full">
              <div className="space-y-1">
                <p className="text-[9px] text-neutral-400 font-mono leading-none tracking-widest uppercase">INGRESS COMPILER URL</p>
                <p className="text-xs font-semibold text-neutral-800 truncate select-all px-3.5 py-2.5 rounded-xl border border-neutral-150 bg-neutral-50 font-mono">
                  {studentFormUrl}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={copyUrlToClipboard}
                  className="flex-1 py-2.5 px-3 hover:bg-neutral-50 text-xs font-semibold text-neutral-800 border border-neutral-250 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono text-[10px]"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-teal-700">COPIED LINK</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>COPY LINK</span>
                    </>
                  )}
                </button>
                <a
                  href={studentFormUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2.5 px-3 bg-neutral-100 hover:bg-neutral-150 text-xs font-semibold text-neutral-800 rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer border border-neutral-200 font-mono text-[10px]"
                >
                  <span>OPEN TAB</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Panel: Primary report display */}
        <div id="analytics-report-view" className="lg:col-span-8 space-y-8 bg-white border border-neutral-200 rounded-3xl p-6 sm:p-10 shadow-xs relative overflow-hidden">
          
          {/* Header layout block */}
          <div className="border-b border-neutral-200 pb-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-black tracking-widest font-mono text-brand-blue uppercase">
                    simplesphere COURSE EVALUATION CO-PILOT
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-neutral-900 tracking-tight">{campaign.title} Metrics</h3>
              </div>
            </div>
            <div className="text-right font-mono text-[9px] text-neutral-400">
              <p>EXPORTED ON: {new Date().toLocaleDateString()}</p>
              <p>PROGRAM ID: {id.slice(0, 8).toUpperCase()}</p>
            </div>
          </div>

          {totalResponses === 0 ? (
            <div className="text-center py-20 px-8 flex flex-col items-center justify-center space-y-4">
              <div className="w-14 h-14 bg-neutral-50 border border-neutral-150 rounded-full flex items-center justify-center text-neutral-300">
                <Users className="w-6 h-6 animate-pulse text-teal-600" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-neutral-900 text-sm">Waiting for Evaluations</h4>
                <p className="text-xs text-neutral-400 max-w-md leading-relaxed">
                  No feedback ratings have been recorded. Once students submit their ratings through the identity-shielded portal, this area will render the complete executive dashboard!
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-10">
              
              {/* Dimensions Bar Chart (No grid lines, gorgeous tech teal bars) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-widest font-mono flex items-center gap-2">
                  <LineChart className="w-4 h-4 text-teal-600" />
                  <span>COMPREHENSIVE RATINGS INDEX</span>
                </h4>
                
                <div className="h-[250px] w-full font-mono text-[10px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barChartData}
                      margin={{ top: 15, right: 10, left: -25, bottom: 5 }}
                    >
                      {/* Grid lines removed completely for a highly minimalist layout */}
                      <XAxis dataKey="name" stroke="#64748b" tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} stroke="#64748b" tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: "rgba(13, 148, 136, 0.04)" }}
                        contentStyle={{
                          background: "#ffffff",
                          borderRadius: "16px",
                          border: "1px solid rgba(229, 229, 229, 0.8)",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.03)",
                          fontSize: "11px",
                          fontFamily: "Inter, sans-serif"
                        }}
                        formatter={(value) => [`${value} / 5.0 Stars`, "Average"]}
                      />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]} maxBarSize={45}>
                        {barChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill="#1e50ff" />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Dimension Metrics breakdown cards */}
              <div className="border border-neutral-150 rounded-2xl overflow-hidden divide-y divide-neutral-150">
                {averages.map((av, idx) => (
                  <div key={idx} className="p-5 flex items-start gap-4 hover:bg-neutral-25/40 transition duration-150">
                    <span className="w-8 py-1 rounded font-mono font-bold text-[10px] text-center bg-neutral-900 text-teal-400 leading-none shrink-0 select-none">
                      Q{idx + 1}
                    </span>
                    <div className="flex-1 space-y-2 text-xs">
                      <p className="font-bold text-neutral-800 leading-snug">{av.question}</p>
                      
                      {/* Distribution weights */}
                      <div className="flex items-center gap-2 pt-1">
                        <span className="text-[9px] text-neutral-400 font-mono font-bold uppercase tracking-wider">WEIGHT DENSITY:</span>
                        <div className="flex items-center gap-3 font-mono text-[9px] text-neutral-500">
                          {[5, 4, 3, 2, 1].map((stars) => {
                            const count = av.distribution[stars as 1|2|3|4|5] || 0;
                            return (
                              <span key={stars} className="flex items-center gap-0.5">
                                <span className={count > 0 ? "text-neutral-800 font-bold" : "text-neutral-400"}>{stars}★</span>
                                <span className="text-neutral-350">:</span>
                                <span className={count > 0 ? "text-teal-600 font-bold" : "text-neutral-400"}>{count}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0 pl-2">
                      <div className="font-extrabold text-neutral-900 text-sm font-mono">{av.average.toFixed(2)}</div>
                      <div className="text-[8px] text-neutral-400 font-mono leading-none uppercase tracking-wider mt-0.5">Stars</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Cumulative Distribution Pie (Teal accent matching monochromatics) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center border-t border-neutral-100 pt-8">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-neutral-400 font-mono uppercase tracking-widest leading-none">
                    DENSITY METRIC ACCUMULATOR
                  </h4>
                  <p className="text-xs text-neutral-500 leading-relaxed font-sans">
                    Aggregated distribution densities compiled across all score parameters. Shows frequency weights on a course-wide level to trace micro-trends.
                  </p>
                </div>
                
                <div className="h-[180px] w-full flex items-center justify-center font-sans text-xs">
                  {pieChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend iconSize={8} iconType="circle" layout="vertical" align="right" verticalAlign="middle" />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-xs text-neutral-400 font-mono">NOT ENOUGH METRIC PATTERNS</span>
                  )}
                </div>
              </div>

              {/* Student open-ended commentary */}
              <div className="space-y-4 border-t border-neutral-100 pt-8">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest font-mono flex items-center gap-2">
                  <MessageSquareCode className="w-4 h-4 text-teal-600" />
                  <span>TRANSPARENT REVIEWS ({suggestions.length})</span>
                </h4>

                <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
                  {suggestions.length === 0 ? (
                    <p className="text-xs text-neutral-450 italic font-mono pl-1">No recommendations submitted for this campaign yet.</p>
                  ) : (
                    suggestions.map((sug) => {
                      const agoStr = new Date(sug.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      });

                      return (
                        <div key={sug.id} className="p-4 bg-neutral-25/50 border border-neutral-150 hover:border-neutral-250 transition-colors rounded-2xl space-y-2 text-xs text-wrap relative">
                          <p className="text-neutral-700 leading-relaxed font-sans">{sug.text}</p>
                          <div className="flex justify-between items-center text-[9px] text-neutral-400 font-mono pt-1">
                            <span className="flex items-center gap-1.5 select-none">
                              <Shield className="w-3 h-3 text-teal-600" />
                              <span>IDENTITY KEY SHIELDED</span>
                            </span>
                            <span>{agoStr}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* simplesphere foot signature */}
              <p className="text-center font-mono text-[9px] text-neutral-300 pt-8 flex items-center justify-center gap-1.5 select-none uppercase tracking-widest">
                <Activity className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                <span>simplesphere feedback hub • compiled on secure server environments</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
