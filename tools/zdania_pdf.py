# -*- coding: utf-8 -*-
"""PDF z całym bankiem zdań (do druku / nauki offline).
Uruchom: python tools/zdania_pdf.py [sciezka_wyjsciowa.pdf]
"""
import json, os, sys
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak)

FONT_DIR = "/usr/share/fonts/truetype/dejavu"
pdfmetrics.registerFont(TTFont("DJ", os.path.join(FONT_DIR, "DejaVuSans.ttf")))
pdfmetrics.registerFont(TTFont("DJ-B", os.path.join(FONT_DIR, "DejaVuSans-Bold.ttf")))
pdfmetrics.registerFont(TTFont("DJ-I", os.path.join(FONT_DIR, "DejaVuSans-Oblique.ttf")))

INK = colors.HexColor("#1e2833")
SOFT = colors.HexColor("#5b6b7b")
LINE = colors.HexColor("#ccd6df")
VIOLET = colors.HexColor("#7048e8")
STEEL = colors.HexColor("#eef2f6")

S = {
    "title": ParagraphStyle("t", fontName="DJ-B", fontSize=26, leading=31, textColor=INK, spaceAfter=4),
    "sub": ParagraphStyle("s", fontName="DJ", fontSize=11.5, leading=16, textColor=SOFT, spaceAfter=16),
    "group": ParagraphStyle("g", fontName="DJ-B", fontSize=15, leading=19, textColor=VIOLET,
                            spaceBefore=14, spaceAfter=6),
    "stage": ParagraphStyle("st", fontName="DJ-B", fontSize=12.5, leading=16, textColor=INK,
                            spaceBefore=10, spaceAfter=2),
    "note": ParagraphStyle("n", fontName="DJ", fontSize=9.5, leading=13, textColor=SOFT, spaceAfter=6),
    "en": ParagraphStyle("en", fontName="DJ-B", fontSize=10.5, leading=14, textColor=INK),
    "pl": ParagraphStyle("pl", fontName="DJ", fontSize=10, leading=13.5, textColor=SOFT),
    "tip": ParagraphStyle("tip", fontName="DJ-I", fontSize=8.5, leading=11.5, textColor=VIOLET),
    "body": ParagraphStyle("b", fontName="DJ", fontSize=10, leading=14.5, textColor=INK, spaceAfter=5),
}

GROUPS = {"slownictwo": "Słownictwo — poziom trudności",
          "phrasal": "Dwa wyrazy = inne znaczenie",
          "czasy": "Czasy podstawowe"}


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("DJ", 8)
    canvas.setFillColor(SOFT)
    canvas.drawString(18 * mm, 12 * mm, "LinguaForge — bank zdań")
    canvas.drawRightString(A4[0] - 18 * mm, 12 * mm, str(canvas.getPageNumber()))
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 15 * mm, A4[0] - 18 * mm, 15 * mm)
    canvas.restoreState()


def build(data, out):
    doc = SimpleDocTemplate(out, pagesize=A4, title="LinguaForge — bank zdań",
                            author="LinguaForge", leftMargin=18 * mm, rightMargin=18 * mm,
                            topMargin=18 * mm, bottomMargin=20 * mm)
    story = [Paragraph("Bank zdań", S["title"]),
             Paragraph("Ścieżki „Tworzenie zdań” i „Słuchanie zdań”. Zakryj prawą kolumnę i przetłumacz "
                       "zdanie na angielski — albo zakryj lewą i przetłumacz na polski.", S["sub"])]

    stages = data["stages"]
    total = sum(len(s["items"]) for s in stages)
    rows = [["Etap", "Grupa", "Trudność", "Zdań"]]
    for st in stages:
        rows.append([st["name"], GROUPS.get(st["group"], st["group"]),
                     "●" * st["diff"] + "○" * (4 - st["diff"]), str(len(st["items"]))])
    t = Table(rows, colWidths=[78 * mm, 52 * mm, 20 * mm, 14 * mm], hAlign="LEFT")
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, 0), "DJ-B", 9),
        ("FONT", (0, 1), (-1, -1), "DJ", 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), SOFT),
        ("TEXTCOLOR", (1, 1), (-1, -1), SOFT),
        ("LINEBELOW", (0, 0), (-1, 0), 0.7, LINE),
        ("LINEBELOW", (0, 1), (-1, -2), 0.3, LINE),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story += [t, Spacer(1, 8),
              Paragraph(f"Razem: {len(stages)} etapów, {total} zdań.", S["note"]), PageBreak()]

    last_group = None
    for st in stages:
        if st["group"] != last_group:
            story.append(Paragraph(GROUPS.get(st["group"], st["group"]), S["group"]))
            last_group = st["group"]
        # emoji pomijamy — czcionka PDF nie ma tych znaków (rysowałyby się jako czarne kwadraty)
        story.append(Paragraph(st["name"], S["stage"]))
        story.append(Paragraph(f"{st['short']} · poziom {st['level']} · trudność "
                               + "●" * st["diff"] + "○" * (4 - st["diff"]), S["note"]))
        rows = []
        for k, it in enumerate(st["items"], 1):
            left = [Paragraph(f"{k}. {it['en']}", S["en"])]
            if it.get("note"):
                left.append(Paragraph(it["note"], S["tip"]))
            rows.append([left, Paragraph(it["pl"], S["pl"])])
        t = Table(rows, colWidths=[92 * mm, 82 * mm], hAlign="LEFT")
        t.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("LINEBELOW", (0, 0), (-1, -2), 0.3, LINE),
            ("BACKGROUND", (0, 0), (-1, -1), colors.white),
            ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, STEEL]),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story += [t, Spacer(1, 6)]

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return out


if __name__ == "__main__":
    here = os.path.dirname(__file__)
    data = json.load(open(os.path.join(here, "..", "data", "zdania", "zdania.json"), encoding="utf-8"))
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "..", "LinguaForge_bank_zdan.pdf")
    print("zapisano:", build(data, out))
