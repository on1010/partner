const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const YETKILI_ROL = "1458934160923037696";
const GROQ_API_KEY = "";
const DATA_PATH = path.join(__dirname, "../data/partner-data.json");

function veriOku() {
  if (!fs.existsSync(DATA_PATH)) return {};
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

async function aiAnaliz(userId, veri) {
  const prompt = `Sen bir Discord sunucu yönetim asistanısın. Aşağıdaki partner yetkilisinin istatistiklerini analiz et ve 5 yıldız üzerinden puan ver. Türkçe, kısa ve net yaz.

Toplam baktığı başvuru: ${veri.toplamKanal}
Ortalama yanıt süresi: ${veri.ortalamaYanitSuresi} dakika
Onayladığı: ${veri.onayladi}
Reddettiği: ${veri.reddetti}
Kapattığı: ${veri.kapatti}
Son aktiflik: ${veri.sonAktiflik || "Bilinmiyor"}

Şu formatta yanıt ver, başka hiçbir şey yazma:
YILDIZ: X
ANALİZ: (1-2 cümle)`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama3-8b-8192",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
    }),
  });

  const json = await res.json();
  return json.choices?.[0]?.message?.content || "YILDIZ: 3\nANALİZ: Analiz yapılamadı.";
}

function yildizGoster(sayi) {
  const tam = Math.min(Math.max(parseInt(sayi) || 3, 1), 5);
  return "⭐".repeat(tam) + "✩".repeat(5 - tam);
}

function performansBar(deger, maks) {
  const yuzde = Math.min(Math.round((deger / maks) * 10), 10);
  return "█".repeat(yuzde) + "░".repeat(10 - yuzde);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("partner-gecmis")
    .setDescription("Partner yetkililerinin geçmişini ve AI analizini gösterir.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    if (!interaction.member.roles.cache.has(YETKILI_ROL)) {
      return interaction.reply({
        content: "Bu komutu kullanmaya yetkiniz bulunmamaktadır.",
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const veri = veriOku();

    if (Object.keys(veri).length === 0) {
      return interaction.editReply({ content: "Henüz kayıtlı partner verisi yok." });
    }

    const sirali = Object.entries(veri).sort((a, b) => b[1].toplamKanal - a[1].toplamKanal);
    const enYuksekKanal = Math.max(...sirali.map(([, v]) => v.toplamKanal), 1);

    const rozetler = ["🥇", "🥈", "🥉"];

    let satirlar = "";

    for (let i = 0; i < sirali.length; i++) {
      const [userId, kullaniciVeri] = sirali[i];
      const analiz = await aiAnaliz(userId, kullaniciVeri);

      const yildizMatch = analiz.match(/YILDIZ:\s*(\d)/);
      const analizMatch = analiz.match(/ANALİZ:\s*(.+)/);

      const yildiz = yildizGoster(yildizMatch ? yildizMatch[1] : "3");
      const analizMetin = analizMatch ? analizMatch[1].trim() : "Veri yetersiz.";
      const rozet = rozetler[i] || `**#${i + 1}**`;
      const bar = performansBar(kullaniciVeri.toplamKanal, enYuksekKanal);
      const hizMetin = kullaniciVeri.ortalamaYanitSuresi === 0 ? "Anlık" : `${kullaniciVeri.ortalamaYanitSuresi} dk`;
      const toplamIslem = kullaniciVeri.onayladi + kullaniciVeri.reddetti;
      const onayOrani = toplamIslem > 0 ? Math.round((kullaniciVeri.onayladi / toplamIslem) * 100) : 0;

      satirlar += `- ${rozet} <@${userId}> — ${yildiz}\n`;
      satirlar += `- ✅ ${kullaniciVeri.onayladi} onay  ❌ ${kullaniciVeri.reddetti} red  🔒 ${kullaniciVeri.kapatti} kapatma\n\n`;
      satirlar += `- 🕐 Son aktif: ${kullaniciVeri.sonAktiflik || "Bilinmiyor"}\n\n`;
      if (i < sirali.length - 1) satirlar += "\n";
    }

    const panel = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# 📊 Partner Yetkili Geçmişi")
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          `**Toplam Yetkili:** ${sirali.length}  |  **Toplam Başvuru:** ${sirali.reduce((a, [, v]) => a + v.toplamKanal, 0)}`
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(satirlar.trim())
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`-# Analiz ${new Date().toLocaleString("tr-TR")} tarihinde yapıldı.`)
      );

    await interaction.editReply({
      components: [panel],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};