import { findCdn } from '../data/third-parties.js';
import { say } from '../i18n.js';
import type { Finding, Rule } from '../types.js';
import { groupRequestsByVendor } from './third-party-hits.js';

const ID = 'third-party-cdns';

export const thirdPartyCdns: Rule = {
  id: ID,
  title: 'Scripts or styles loaded from a public CDN',
  description:
    "Every request to a public CDN sends the visitor's IP address to its operator. The same " +
    'reasoning that made Google Fonts a problem applies, but there is no court ruling on CDNs ' +
    'specifically, so this is only a hint.',
  references: ['Art. 6(1) GDPR', 'LG München I, 20.01.2022, Az. 3 O 17493/20 (by analogy)'],
  check({ page, lang }) {
    return [...groupRequestsByVendor(page.requests, findCdn)].map(
      ([vendor, evidence]): Finding => ({
        ruleId: ID,
        severity: 'info',
        message: say(lang, {
          en: `Files are loaded from ${vendor}.`,
          de: `Dateien werden von ${vendor} geladen.`,
          hu: `Az oldal fájlokat tölt be innen: ${vendor}.`,
          fr: `Des fichiers sont chargés depuis ${vendor}.`,
          it: `I file vengono caricati da ${vendor}.`,
          es: `Se cargan archivos desde ${vendor}.`,
          pl: `Pliki są ładowane z ${vendor}.`,
        }),
        pageUrl: page.finalUrl,
        subject: vendor,
        evidence,
        fix: say(lang, {
          en: 'Install the library with your package manager and bundle it, or copy the files to your own server.',
          de: 'Die Bibliothek über den Paketmanager installieren und mitbündeln oder die Dateien auf den eigenen Server kopieren.',
          hu: 'Telepítse a könyvtárat csomagkezelővel és csomagolja az oldal kódjába, vagy másolja a fájlokat a saját szerverére.',
          fr: 'Installez la bibliothèque avec votre gestionnaire de paquets et intégrez-la au build, ou copiez les fichiers sur votre propre serveur.',
          it: 'Installa la libreria con il tuo gestore di pacchetti e includila nel bundle, oppure copia i file sul tuo server.',
          es: 'Instala la biblioteca con tu gestor de paquetes e inclúyela en el bundle, o copia los archivos a tu propio servidor.',
          pl: 'Zainstaluj bibliotekę menedżerem pakietów i dołącz ją do bundla albo skopiuj pliki na własny serwer.',
        }),
      }),
    );
  },
};
