// frontend/src/shared/composables/useExportPdf.js
// Exporta notas do usuário para PDF elegante usando jsPDF
// Instale: npm install jspdf (dentro da pasta frontend)

import { ref } from 'vue'

export function useExportPdf() {
  const exporting = ref(false)

  async function exportNotes(notes, userName = 'Usuário') {
    exporting.value = true

    try {
      // Importa jsPDF dinamicamente
      const { jsPDF } = await import('jspdf')

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pageW  = doc.internal.pageSize.getWidth()
      const pageH  = doc.internal.pageSize.getHeight()
      const margin = 20
      const maxW   = pageW - margin * 2
      let   y      = 0

      // ── Cores ─────────────────────────────────────────────
      const colors = {
        dark:   [28,  26,  23],
        gold:   [184, 150, 90],
        sage:   [138, 158, 140],
        light:  [249, 246, 240],
        mid:    [74,  69,  64],
        faint:  [200, 196, 190],
      }

      // ── Helpers ────────────────────────────────────────────
      function setColor(rgb, type = 'text') {
        if (type === 'text') doc.setTextColor(...rgb)
        else                 doc.setFillColor(...rgb)
      }

      function drawLine(yPos, color = colors.faint) {
        doc.setDrawColor(...color)
        doc.setLineWidth(0.3)
        doc.line(margin, yPos, pageW - margin, yPos)
      }

      function addPage() {
        doc.addPage()
        y = margin
        drawPageHeader()
      }

      function checkPage(needed = 20) {
        if (y + needed > pageH - margin) addPage()
      }

      // ── Cabeçalho de cada página ───────────────────────────
      function drawPageHeader() {
        // Faixa superior dourada
        setColor(colors.gold, 'fill')
        doc.rect(0, 0, pageW, 8, 'F')

        // ✦ Logos
        setColor(colors.light, 'text')
        doc.setFontSize(7)
        doc.setFont('helvetica', 'bold')
        doc.text('✦  LOGOS — Notas de Estudo Bíblico', margin, 5.5)

        // Data
        const dateStr = new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' })
        doc.text(dateStr, pageW - margin, 5.5, { align: 'right' })

        y = 18
      }

      // ── Rodapé ─────────────────────────────────────────────
      function drawFooters() {
        const total = doc.internal.getNumberOfPages()
        for (let p = 1; p <= total; p++) {
          doc.setPage(p)
          drawLine(pageH - 12, colors.faint)
          setColor(colors.faint, 'text')
          doc.setFontSize(7)
          doc.setFont('helvetica', 'normal')
          doc.text(`${userName}  ·  Logos`, margin, pageH - 7)
          doc.text(`${p} / ${total}`, pageW - margin, pageH - 7, { align: 'right' })
        }
      }

      // ════════════════════════════════════════════════════════
      // PÁGINA DE CAPA
      // ════════════════════════════════════════════════════════

      // Fundo creme
      setColor(colors.light, 'fill')
      doc.rect(0, 0, pageW, pageH, 'F')

      // Faixa lateral dourada
      setColor(colors.gold, 'fill')
      doc.rect(0, 0, 6, pageH, 'F')

      // Ornamento ✦ grande
      setColor(colors.gold, 'text')
      doc.setFontSize(42)
      doc.setFont('helvetica', 'bold')
      doc.text('✦', pageW / 2, 80, { align: 'center' })

      // Título
      setColor(colors.dark, 'text')
      doc.setFontSize(28)
      doc.setFont('helvetica', 'bold')
      doc.text('Notas de Estudo', pageW / 2, 105, { align: 'center' })

      setColor(colors.gold, 'text')
      doc.setFontSize(14)
      doc.setFont('helvetica', 'normal')
      doc.text('Bíblico', pageW / 2, 115, { align: 'center' })

      // Linha decorativa
      drawLine(128, colors.gold)

      // Nome do usuário
      setColor(colors.mid, 'text')
      doc.setFontSize(11)
      doc.text(userName, pageW / 2, 140, { align: 'center' })

      // Data
      setColor(colors.faint, 'text')
      doc.setFontSize(9)
      const fullDate = new Date().toLocaleDateString('pt-BR', {
        weekday:'long', day:'numeric', month:'long', year:'numeric'
      })
      doc.text(fullDate, pageW / 2, 150, { align: 'center' })

      // Total de notas
      setColor(colors.sage, 'text')
      doc.setFontSize(9)
      doc.text(`${notes.length} nota${notes.length !== 1 ? 's' : ''} exportada${notes.length !== 1 ? 's' : ''}`, pageW / 2, 165, { align: 'center' })

      // Versículo de rodapé da capa
      setColor(colors.gold, 'fill')
      doc.rect(margin, pageH - 50, maxW, 0.3, 'F')

      setColor(colors.mid, 'text')
      doc.setFontSize(9)
      doc.setFont('helvetica', 'italic')
      const versiculo = '"Toda a Escritura é inspirada por Deus..."'
      doc.text(versiculo, pageW / 2, pageH - 38, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      setColor(colors.faint, 'text')
      doc.setFontSize(8)
      doc.text('2 Timóteo 3:16', pageW / 2, pageH - 30, { align: 'center' })

      // ════════════════════════════════════════════════════════
      // PÁGINAS DE NOTAS
      // ════════════════════════════════════════════════════════

      // Agrupa notas por livro
      const byBook = {}
      const livres = []

      for (const note of notes) {
        if (note.bookAbbr || note.bookName) {
          const key = note.bookName || note.bookAbbr
          if (!byBook[key]) byBook[key] = []
          byBook[key].push(note)
        } else {
          livres.push(note)
        }
      }

      const groups = [
        ...Object.entries(byBook).map(([name, ns]) => ({ name, notes: ns })),
        ...(livres.length ? [{ name: 'Notas Livres', notes: livres }] : []),
      ]

      for (const group of groups) {
        // Nova página para cada livro
        addPage()

        // ── Título do livro ──────────────────────────────────
        setColor(colors.dark, 'fill')
        doc.rect(margin, y - 4, maxW, 14, 'F')

        setColor(colors.light, 'text')
        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text(group.name, margin + 4, y + 5)

        setColor(colors.gold, 'text')
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`${group.notes.length} nota${group.notes.length !== 1 ? 's' : ''}`, pageW - margin - 2, y + 5, { align: 'right' })

        y += 18

        // ── Notas do grupo ───────────────────────────────────
        for (const note of group.notes) {
          checkPage(35)

          // Badge de referência
          if (note.bookAbbr && note.chapter && note.verseNum) {
            const ref = `${note.bookAbbr} ${note.chapter}:${note.verseNum}`

            setColor(colors.gold, 'fill')
            doc.roundedRect(margin, y, 35, 6, 1, 1, 'F')
            setColor(colors.light, 'text')
            doc.setFontSize(7.5)
            doc.setFont('helvetica', 'bold')
            doc.text(ref, margin + 3, y + 4.2)
            y += 9
          }

          // Texto do versículo vinculado
          if (note.verseText) {
            checkPage(15)
            setColor(colors.sage, 'fill')
            doc.rect(margin, y, 1.5, 0, 'F')

            setColor(colors.mid, 'text')
            doc.setFontSize(8.5)
            doc.setFont('helvetica', 'italic')

            const verseLines = doc.splitTextToSize(`"${note.verseText}"`, maxW - 8)
            // Barra lateral sálvia
            doc.setDrawColor(...colors.sage)
            doc.setLineWidth(1.5)
            doc.line(margin + 1, y, margin + 1, y + verseLines.length * 5 + 2)

            doc.text(verseLines, margin + 6, y + 4)
            y += verseLines.length * 5 + 8
            checkPage(10)
          }

          // Conteúdo da nota
          setColor(colors.dark, 'text')
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')

          const contentLines = doc.splitTextToSize(note.content || '', maxW)
          for (const line of contentLines) {
            checkPage(7)
            doc.text(line, margin, y)
            y += 6
          }

          // Tags
          if (note.tags?.length) {
            checkPage(10)
            y += 2
            let tagX = margin
            for (const tag of note.tags) {
              const tagW = doc.getTextWidth(tag) + 6
              if (tagX + tagW > pageW - margin) { tagX = margin; y += 7 }
              setColor(colors.sage, 'fill')
              doc.setFillColor(138, 158, 140, 0.2)
              doc.roundedRect(tagX, y - 3.5, tagW, 5.5, 1, 1, 'F')
              setColor(colors.sage, 'text')
              doc.setFontSize(7)
              doc.text(tag, tagX + 3, y + 0.8)
              tagX += tagW + 3
            }
            y += 8
          }

          // Data da nota
          if (note.updatedAt || note.createdAt) {
            checkPage(8)
            setColor(colors.faint, 'text')
            doc.setFontSize(7)
            doc.setFont('helvetica', 'normal')
            const d = new Date(note.updatedAt || note.createdAt)
            doc.text(d.toLocaleDateString('pt-BR'), pageW - margin, y, { align: 'right' })
            y += 4
          }

          // Separador
          checkPage(8)
          y += 3
          drawLine(y, colors.faint)
          y += 6
        }
      }

      // ── Rodapés em todas as páginas ──────────────────────────
      drawFooters()

      // ── Download ─────────────────────────────────────────────
      const fileName = `logos-notas-${new Date().toISOString().slice(0,10)}.pdf`
      doc.save(fileName)

    } finally {
      exporting.value = false
    }
  }

  return { exporting, exportNotes }
}