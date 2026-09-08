package com.danphe.emr.service;

import java.io.IOException;
import java.io.Writer;
import java.time.temporal.Temporal;
import java.util.List;

/**
 * Minimal RFC 4180 CSV writer.
 *
 * Written rather than pulled in because the escaping is the whole job and it is twenty lines:
 * a patient address containing a comma, a clinical note containing a newline, or a name
 * containing a quote will each corrupt every downstream column if written naively.
 */
public final class CsvWriter {

    private final Writer out;

    public CsvWriter(Writer out) {
        this.out = out;
    }

    /**
     * Excel and Google Sheets assume the platform encoding unless a BOM says otherwise, which
     * mangles Indian names in Kannada, Hindi and Urdu. This makes them read it as UTF-8.
     */
    public void writeUtf8Bom() throws IOException {
        out.write('﻿');
    }

    public void writeRow(List<?> values) throws IOException {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) sb.append(',');
            sb.append(escape(values.get(i)));
        }
        sb.append("\r\n");
        out.write(sb.toString());
    }

    private static String escape(Object value) {
        if (value == null) return "";
        String s = value instanceof Temporal ? value.toString() : String.valueOf(value);

        // A leading =, +, - or @ makes a spreadsheet treat the cell as a formula. With clinical
        // free text that is both a corruption risk and a genuine injection vector, so prefix it.
        if (!s.isEmpty() && "=+-@".indexOf(s.charAt(0)) >= 0) {
            s = "'" + s;
        }

        boolean needsQuotes = s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r");
        if (!needsQuotes) return s;
        return '"' + s.replace("\"", "\"\"") + '"';
    }
}
