# Vision IPTV Player Sports Data

Bu repo uygulamanin ana ekranindaki Spor Takvimi alanini besler.

Uygulama su dosyayi okur:

```text
https://raw.githubusercontent.com/Netx0-1/vsiptvplayer-sports-data/main/sports.json
```

## Format

`channels` alaninda kanal adi ile IPTV `stream_id` eslestirilir. Etkinlikte `channel` ayni yazilirsa uygulama direkt o yayini acar.

```json
{
  "updated_at": "2026-05-07 00:00",
  "channels": {
    "beIN SPORTS 1": "12345"
  },
  "events": [
    {
      "date": "2026-05-10",
      "time": "20:00",
      "sport": "Futbol",
      "league": "Super Lig",
      "title": "Takim A - Takim B",
      "channel": "beIN SPORTS 1"
    }
  ]
}
```

Etkinlige direkt `stream_id` veya tam `url` de verilebilir:

```json
{
  "title": "Final Maci",
  "channel": "beIN SPORTS 1",
  "stream_id": "12345"
}
```

## Otomatik guncelleme

GitHub Actions her 6 saatte bir `npm run update` komutunu calistirir.

Script `sources.json` icindeki Spor Ekrani kanal sayfalarindan maclari okur, `channels.json` icindeki kanal eslesmelerine gore oynatilabilir olanlari secer ve `sports.json` dosyasini yeniden yazar.

Yeni bir kanal eklemek icin:

1. IPTV `stream_id` degerini `channels.json` icine ekle.
2. Gerekirse kaynak kanal sayfasini `sources.json` icine ekle.
3. Actions sekmesinden `Update sports schedule` workflow'unu manuel calistir veya zamanli calismasini bekle.
