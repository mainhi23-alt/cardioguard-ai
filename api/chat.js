export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Chưa cấu hình GEMINI_API_KEY trên Vercel." });
  }

  const { question } = req.body || {};
  if (!question || !String(question).trim()) {
    return res.status(400).json({ error: "Thiếu nội dung câu hỏi." });
  }

  const systemPrompt = [
    "Bạn là Dược sĩ Lâm sàng Tim mạch. Trả lời tiếng Việt ngắn gọn, súc tích, rõ ràng theo đúng 4 mục:",
    "1. Mức độ nghiêm trọng (Chống chỉ định / Nguy cơ cao / Trung bình / Thấp)",
    "2. Cơ chế tương tác",
    "3. Hậu quả lâm sàng",
    "4. Hướng xử trí & Theo dõi",
    "Trình bày gọn bằng gạch đầu dòng ngắn để phản hồi nhanh; kết thúc bằng câu nhắc tham khảo ý kiến bác sĩ/dược sĩ."
  ].join("\n");

  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: String(question).trim() }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 850,
          thinkingConfig: { thinkingBudget: 0 }
        }
      })
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error: data?.error?.message || `Lỗi Gemini API (${upstream.status})`
      });
    }

    const answer = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || "")
      .join("")
      .trim();

    if (!answer) {
      return res.status(502).json({ error: "Mô hình không trả về nội dung." });
    }

    return res.status(200).json({ answer });
  } catch (err) {
    return res.status(500).json({ error: err?.message || "Lỗi kết nối máy chủ." });
  }
}
