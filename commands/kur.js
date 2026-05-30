const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("kur")
    .setDescription("Partnerlik panelini kur.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const panel = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent("# 🤝 Partnerlik")
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(true)
      )
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
          "Sunucumuzla partnerlik kurarak topluluğunuzu büyütmek ister misiniz? Aşağıdaki butona tıklayarak hızlıca başvuruda bulunabilirsiniz.\n\n" +
          "### 📋 Başvuru Sırasında İstenen Bilgiler:\n" +
          "• **Sunucu İsmi:** Başvuru yaptığınız topluluğun resmi adı.\n" +
          "• **Üye Sayısı:** Sunucunuzun anlık güncel üye miktarı.\n" +
          "• **Partnerlik Metni:** Sunucunuzu tanıtan ve davet linkinizi içeren reklam metniniz.\n\n" +
          "> **Bilgilendirme:** Formu doldurup gönderdikten sonra yetkililerimiz metninizi ve sunucunuzu inceleyecektir. Onay durumunda botumuz sizi otomatik olarak bilgilendirecektir."
        )
      )
      .addSeparatorComponents(
        new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small).setDivider(false)
      )
      .addActionRowComponents(
        new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("partner_basvur")
            .setLabel("Partner Yap!")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🤝")
        )
      );

    await interaction.reply({
      content: "✅ Panel başarıyla kuruldu!",
      flags: MessageFlags.Ephemeral,
    });

    await interaction.channel.send({
      components: [panel],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};