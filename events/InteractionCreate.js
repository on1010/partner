const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const YETKILI_ROL = "1458934160923037696";
const GORUNUR_ROL = "1456797750007169129";
const KATEGORI_ID = "1458935920723103918";
const DATA_PATH = path.join(__dirname, "../data/partner-data.json");

function veriOku() {
  if (!fs.existsSync(DATA_PATH)) return {};
  return JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
}

function veriYaz(data) {
  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
}

function kullaniciGuncelle(userId, alan, deger) {
  const veri = veriOku();
  if (!veri[userId]) {
    veri[userId] = { toplamKanal: 0, onayladi: 0, reddetti: 0, kapatti: 0, ortalamaYanitSuresi: 0, yanitSureleri: [], sonAktiflik: null };
  }
  if (alan === "yanitSuresi") {
    veri[userId].yanitSureleri.push(deger);
    const toplam = veri[userId].yanitSureleri.reduce((a, b) => a + b, 0);
    veri[userId].ortalamaYanitSuresi = Math.round(toplam / veri[userId].yanitSureleri.length);
  } else {
    veri[userId][alan] = (veri[userId][alan] || 0) + deger;
  }
  veri[userId].sonAktiflik = new Date().toLocaleString("tr-TR");
  veriYaz(veri);
}

const kanalAcilisZamanlari = new Map();

function butonlar(onaylaDisabled, reddetDisabled, kapatDisabled) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("partner_onayla").setLabel("Onayla!").setStyle(ButtonStyle.Success).setEmoji("✅").setDisabled(onaylaDisabled),
    new ButtonBuilder().setCustomId("partner_reddet").setLabel("Reddet!").setStyle(ButtonStyle.Danger).setEmoji("❌").setDisabled(reddetDisabled),
    new ButtonBuilder().setCustomId("partner_kapat").setLabel("Kapat").setStyle(ButtonStyle.Secondary).setEmoji("🔒").setDisabled(kapatDisabled)
  );
}

module.exports = {
  name: "interactionCreate",

  async execute(interaction, client) {

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;
      await command.execute(interaction, client);
      return;
    }

    if (interaction.isButton() && interaction.customId === "partner_basvur") {
      const modal = new ModalBuilder().setCustomId("partnership_modal").setTitle("Partnerlik Başvurusu");
      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("sunucu_ismi").setLabel("Sunucunuzun İsmi").setStyle(TextInputStyle.Short).setPlaceholder("Sunucunuzun ismini giriniz.").setRequired(true).setMaxLength(100)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("partner_text").setLabel("Partner Metni").setStyle(TextInputStyle.Paragraph).setPlaceholder("Sunucunuzu tanıtan metni giriniz.").setRequired(true).setMaxLength(4000)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("uye_sayisi").setLabel("Üye Sayısı").setStyle(TextInputStyle.Short).setPlaceholder("Sunucunuzdaki üye sayısını giriniz.").setRequired(true).setMaxLength(20)
        )
      );
      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "partnership_modal") {
      const sunucuIsmi = interaction.fields.getTextInputValue("sunucu_ismi");
      const partnerText = interaction.fields.getTextInputValue("partner_text");
      const uyeSayisi = interaction.fields.getTextInputValue("uye_sayisi");
      const basvuran = interaction.member;
      const guild = interaction.guild;

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      let kanal;
      try {
        kanal = await guild.channels.create({
          name: `partner-${interaction.user.username}`,
          type: ChannelType.GuildText,
          parent: KATEGORI_ID,
          permissionOverwrites: [
            { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: YETKILI_ROL, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          ],
        });
      } catch (err) {
        return interaction.editReply({ content: "Kanal oluşturulurken bir hata oluştu." });
      }

      kanalAcilisZamanlari.set(kanal.id, Date.now());

      const panel = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`<@&${YETKILI_ROL}> ${basvuran} — Yeni bir partnerlik başvurusu geldi!\n# 📋 Yeni Partnerlik Başvurusu`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**🏠 Sunucu İsmi**\n${sunucuIsmi}\n\n**👥 Üye Sayısı**\n${uyeSayisi}\n\n**📝 Partner Metni**\n${partnerText}\n\n**👤 Başvuran**\n${basvuran}`))
        .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
        .addActionRowComponents(butonlar(false, false, false));

      await kanal.send({ components: [panel], flags: MessageFlags.IsComponentsV2 });
      await interaction.editReply({ content: `✅ Başvurunuz alındı! ${kanal} kanalına yönlendirildiniz.` });
      return;
    }

    if (interaction.isButton() && ["partner_onayla", "partner_reddet", "partner_kapat"].includes(interaction.customId)) {
      if (!interaction.member.roles.cache.has(YETKILI_ROL)) {
        return interaction.reply({ content: "Bu butonu kullanmaya yetkiniz bulunmamaktadır.", flags: MessageFlags.Ephemeral });
      }

      const userId = interaction.user.id;
      const kanalId = interaction.channel.id;
      const acilisZamani = kanalAcilisZamanlari.get(kanalId);
      if (acilisZamani) {
        const gecenDakika = Math.round((Date.now() - acilisZamani) / 60000);
        kullaniciGuncelle(userId, "yanitSuresi", gecenDakika);
        kanalAcilisZamanlari.delete(kanalId);
      }

      const eskiContainer = interaction.message.components[0];
      const textComponents = eskiContainer.components.filter((c) => c.type === 10);
      const bilgiText = textComponents[1]?.content || "";
      const sunucuIsmiMatch = bilgiText.match(/\*\*🏠 Sunucu İsmi\*\*\n([^\n]+)/);
      const sunucuIsmi = sunucuIsmiMatch ? sunucuIsmiMatch[1] : "Bilinmiyor";

      if (interaction.customId === "partner_onayla") {
        kullaniciGuncelle(userId, "toplamKanal", 1);
        kullaniciGuncelle(userId, "onayladi", 1);

        const yeniPanel = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent("# ✅ Partnerlik Onaylandı"))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(bilgiText))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addActionRowComponents(butonlar(true, true, false));

        await interaction.update({ components: [yeniPanel], flags: MessageFlags.IsComponentsV2 });
        await interaction.channel.send({
          components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ **${sunucuIsmi}** Sunucusuyla Partnerlik İşlemi Onaylandı!`))],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      if (interaction.customId === "partner_reddet") {
        kullaniciGuncelle(userId, "toplamKanal", 1);
        kullaniciGuncelle(userId, "reddetti", 1);

        const yeniPanel = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent("# ❌ Partnerlik Reddedildi"))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(bilgiText))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addActionRowComponents(butonlar(true, true, false));

        await interaction.update({ components: [yeniPanel], flags: MessageFlags.IsComponentsV2 });
        await interaction.channel.send({
          components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`❌ **${sunucuIsmi}** Sunucusuyla Partnerlik İşlemi Onaylanmadı!`))],
          flags: MessageFlags.IsComponentsV2,
        });
        return;
      }

      if (interaction.customId === "partner_kapat") {
        kullaniciGuncelle(userId, "kapatti", 1);

        const yeniPanel = new ContainerBuilder()
          .addTextDisplayComponents(new TextDisplayBuilder().setContent("# 🔒 Kapatıldı"))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addTextDisplayComponents(new TextDisplayBuilder().setContent(bilgiText))
          .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true))
          .addActionRowComponents(butonlar(true, true, true));

        await interaction.update({ components: [yeniPanel], flags: MessageFlags.IsComponentsV2 });

        const kapatMesaji = await interaction.channel.send({
          components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent("🔒 lvewhh ve D I V I N E Güvencesiyle Partner İşlemi! Kanal **3** saniye içinde kapatılıyor..."))],
          flags: MessageFlags.IsComponentsV2,
        });

        let sayac = 3;
        const interval = setInterval(async () => {
          sayac--;
          if (sayac <= 0) {
            clearInterval(interval);
            await interaction.channel.delete().catch(() => {});
          } else {
            await kapatMesaji.edit({
              components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`🔒 lvewhh ve D I V I N E Güvencesiyle Partner İşlemi! Kanal **${sayac}** saniye içinde kapatılıyor...`))],
              flags: MessageFlags.IsComponentsV2,
            });
          }
        }, 1000);
        return;
      }
    }
  },
};