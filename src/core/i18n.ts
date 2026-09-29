/**
 * Card labels and titles. English is the source of truth; other locales override keys and fall back
 * to English for anything missing. Add a locale by adding an object here.
 * Placeholders: {n} number, {year} year.
 */
const en = {
  'title.stats': 'GitHub Stats',
  'title.languages': 'Top Languages',
  'title.streak': 'GitHub Streak',
  'title.contributions': 'Contribution Graph',
  'title.top_repos': 'Top Repositories',
  'title.radar': 'Tech Stack Radar',
  'title.achievements': 'GitHub Achievements',
  'title.activity': 'Contribution Activity',
  'title.profile': 'GitHub Profile',
  'stat.repos': 'Repositories',
  'stat.stars': 'Stars',
  'stat.forks': 'Forks',
  'stat.followers': 'Followers',
  'stat.following': 'Following',
  'stat.gists': 'Gists',
  'stat.commits': 'Commits',
  'stat.contributions': 'Contributions',
  'stat.prs': 'Pull Requests',
  'stat.issues': 'Issues',
  'stat.reviews': 'Reviews',
  'stat.age': 'Years on GitHub',
  'stat.repos.short': 'Repos',
  'stat.contributions.short': 'Contribs',
  'stat.prs.short': 'PRs',
  'streak.total': 'Total Contributions',
  'streak.current': 'Current Streak',
  'streak.longest': 'Longest Streak',
  'streak.present': 'Present',
  'misc.updated': 'Updated',
  'misc.less': 'Less',
  'misc.more': 'More',
  'misc.contributions_last_year': '{n} contributions in the last year',
  'misc.contributions_in': '{n} contributions in {year}',
  'misc.joined': 'Joined',
  'misc.overall': 'Overall',
  'misc.top': 'Top {n}%',
  'misc.next': 'Next'
};

export type Key = keyof typeof en;

const es: Partial<Record<Key, string>> = {
  'title.stats': 'Estadísticas de GitHub', 'title.languages': 'Lenguajes principales', 'title.streak': 'Racha de GitHub',
  'title.contributions': 'Gráfico de contribuciones', 'title.top_repos': 'Repositorios destacados', 'title.radar': 'Radar tecnológico',
  'title.achievements': 'Logros de GitHub', 'title.activity': 'Actividad de contribuciones', 'title.profile': 'Perfil de GitHub',
  'stat.repos': 'Repositorios', 'stat.stars': 'Estrellas', 'stat.followers': 'Seguidores', 'stat.following': 'Siguiendo',
  'stat.contributions': 'Contribuciones', 'stat.reviews': 'Revisiones', 'stat.age': 'Años en GitHub', 'stat.repos.short': 'Repos',
  'stat.contributions.short': 'Contrib.', 'streak.total': 'Contribuciones totales', 'streak.current': 'Racha actual',
  'streak.longest': 'Racha más larga', 'streak.present': 'Presente', 'misc.updated': 'Actualizado', 'misc.less': 'Menos',
  'misc.more': 'Más', 'misc.contributions_last_year': '{n} contribuciones en el último año', 'misc.contributions_in': '{n} contribuciones en {year}',
  'misc.joined': 'Se unió', 'misc.overall': 'General', 'misc.next': 'Siguiente'
};

const fr: Partial<Record<Key, string>> = {
  'title.stats': 'Statistiques GitHub', 'title.languages': 'Langages principaux', 'title.streak': 'Série GitHub',
  'title.contributions': 'Graphique des contributions', 'title.top_repos': 'Meilleurs dépôts', 'title.radar': 'Radar technologique',
  'title.achievements': 'Succès GitHub', 'title.activity': 'Activité des contributions', 'title.profile': 'Profil GitHub',
  'stat.repos': 'Dépôts', 'stat.stars': 'Étoiles', 'stat.followers': 'Abonnés', 'stat.following': 'Abonnements',
  'stat.reviews': 'Revues', 'stat.age': 'Années sur GitHub', 'stat.repos.short': 'Dépôts', 'stat.contributions.short': 'Contrib.',
  'streak.total': 'Contributions totales', 'streak.current': 'Série actuelle', 'streak.longest': 'Plus longue série',
  'streak.present': "Aujourd'hui", 'misc.updated': 'Mis à jour', 'misc.less': 'Moins', 'misc.more': 'Plus',
  'misc.contributions_last_year': '{n} contributions au cours de la dernière année', 'misc.contributions_in': '{n} contributions en {year}',
  'misc.joined': 'Inscrit', 'misc.overall': 'Global', 'misc.top': 'Top {n} %', 'misc.next': 'Suivant'
};

const de: Partial<Record<Key, string>> = {
  'title.stats': 'GitHub-Statistiken', 'title.languages': 'Top-Sprachen', 'title.streak': 'GitHub-Serie',
  'title.contributions': 'Beitragsdiagramm', 'title.top_repos': 'Top-Repositories', 'title.radar': 'Tech-Stack-Radar',
  'title.achievements': 'GitHub-Erfolge', 'title.activity': 'Beitragsaktivität', 'title.profile': 'GitHub-Profil',
  'stat.stars': 'Sterne', 'stat.followers': 'Follower', 'stat.following': 'Folgt', 'stat.contributions': 'Beiträge',
  'stat.age': 'Jahre auf GitHub', 'stat.contributions.short': 'Beiträge', 'streak.total': 'Beiträge gesamt',
  'streak.current': 'Aktuelle Serie', 'streak.longest': 'Längste Serie', 'streak.present': 'Heute', 'misc.updated': 'Aktualisiert',
  'misc.less': 'Weniger', 'misc.more': 'Mehr', 'misc.contributions_last_year': '{n} Beiträge im letzten Jahr',
  'misc.contributions_in': '{n} Beiträge in {year}', 'misc.joined': 'Beigetreten', 'misc.overall': 'Gesamt', 'misc.top': 'Top {n} %',
  'misc.next': 'Nächster'
};

const pt: Partial<Record<Key, string>> = {
  'title.stats': 'Estatísticas do GitHub', 'title.languages': 'Principais linguagens', 'title.streak': 'Sequência do GitHub',
  'title.contributions': 'Gráfico de contribuições', 'title.top_repos': 'Principais repositórios', 'title.radar': 'Radar de tecnologias',
  'title.achievements': 'Conquistas do GitHub', 'title.activity': 'Atividade de contribuições', 'title.profile': 'Perfil do GitHub',
  'stat.repos': 'Repositórios', 'stat.stars': 'Estrelas', 'stat.followers': 'Seguidores', 'stat.following': 'Seguindo',
  'stat.contributions': 'Contribuições', 'stat.reviews': 'Revisões', 'stat.age': 'Anos no GitHub', 'stat.repos.short': 'Repos',
  'stat.contributions.short': 'Contrib.', 'streak.total': 'Contribuições totais', 'streak.current': 'Sequência atual',
  'streak.longest': 'Maior sequência', 'streak.present': 'Presente', 'misc.updated': 'Atualizado', 'misc.less': 'Menos',
  'misc.more': 'Mais', 'misc.contributions_last_year': '{n} contribuições no último ano', 'misc.contributions_in': '{n} contribuições em {year}',
  'misc.joined': 'Entrou em', 'misc.overall': 'Geral', 'misc.next': 'Próximo'
};

const zh: Partial<Record<Key, string>> = {
  'title.stats': 'GitHub 统计', 'title.languages': '常用语言', 'title.streak': 'GitHub 连续贡献', 'title.contributions': '贡献图',
  'title.top_repos': '热门仓库', 'title.radar': '技术栈雷达', 'title.achievements': 'GitHub 成就', 'title.activity': '贡献活动',
  'title.profile': 'GitHub 主页', 'stat.repos': '仓库', 'stat.stars': '星标', 'stat.forks': '复刻', 'stat.followers': '关注者',
  'stat.following': '关注中', 'stat.commits': '提交', 'stat.contributions': '贡献', 'stat.prs': '拉取请求', 'stat.issues': '议题',
  'stat.reviews': '评审', 'stat.age': 'GitHub 年数', 'stat.repos.short': '仓库', 'stat.contributions.short': '贡献', 'stat.prs.short': 'PR',
  'streak.total': '总贡献', 'streak.current': '当前连续', 'streak.longest': '最长连续', 'streak.present': '至今',
  'misc.updated': '更新于', 'misc.less': '少', 'misc.more': '多', 'misc.contributions_last_year': '过去一年共 {n} 次贡献',
  'misc.contributions_in': '{year} 年共 {n} 次贡献', 'misc.joined': '加入于', 'misc.overall': '综合', 'misc.top': '前 {n}%', 'misc.next': '下一级'
};

const ja: Partial<Record<Key, string>> = {
  'title.stats': 'GitHub 統計', 'title.languages': 'よく使う言語', 'title.streak': 'GitHub 連続記録',
  'title.contributions': 'コントリビューショングラフ', 'title.top_repos': '人気リポジトリ', 'title.radar': '技術スタックレーダー',
  'title.achievements': 'GitHub 実績', 'title.activity': 'コントリビューション活動', 'title.profile': 'GitHub プロフィール',
  'stat.repos': 'リポジトリ', 'stat.stars': 'スター', 'stat.forks': 'フォーク', 'stat.followers': 'フォロワー', 'stat.following': 'フォロー中',
  'stat.commits': 'コミット', 'stat.contributions': 'コントリビューション', 'stat.prs': 'プルリクエスト', 'stat.issues': 'イシュー',
  'stat.reviews': 'レビュー', 'stat.age': 'GitHub 歴', 'stat.repos.short': 'リポジトリ', 'stat.contributions.short': '貢献', 'stat.prs.short': 'PR',
  'streak.total': '総コントリビューション', 'streak.current': '現在の連続', 'streak.longest': '最長連続', 'streak.present': '現在',
  'misc.updated': '更新', 'misc.less': '少', 'misc.more': '多', 'misc.contributions_last_year': '過去1年間で {n} 件のコントリビューション',
  'misc.contributions_in': '{year} 年に {n} 件のコントリビューション', 'misc.joined': '参加', 'misc.overall': '総合', 'misc.top': '上位 {n}%',
  'misc.next': '次'
};

const ru: Partial<Record<Key, string>> = {
  'title.stats': 'Статистика GitHub', 'title.languages': 'Топ языков', 'title.streak': 'Серия GitHub', 'title.contributions': 'График вкладов',
  'title.top_repos': 'Лучшие репозитории', 'title.radar': 'Радар технологий', 'title.achievements': 'Достижения GitHub',
  'title.activity': 'Активность вкладов', 'title.profile': 'Профиль GitHub', 'stat.repos': 'Репозитории', 'stat.stars': 'Звёзды',
  'stat.forks': 'Форки', 'stat.followers': 'Подписчики', 'stat.following': 'Подписки', 'stat.commits': 'Коммиты', 'stat.contributions': 'Вклады',
  'stat.prs': 'Pull Request', 'stat.reviews': 'Ревью', 'stat.age': 'Лет на GitHub', 'stat.repos.short': 'Репо', 'stat.contributions.short': 'Вклады',
  'streak.total': 'Всего вкладов', 'streak.current': 'Текущая серия', 'streak.longest': 'Самая длинная серия', 'streak.present': 'Сейчас',
  'misc.updated': 'Обновлено', 'misc.less': 'Меньше', 'misc.more': 'Больше', 'misc.contributions_last_year': '{n} вкладов за последний год',
  'misc.contributions_in': '{n} вкладов в {year}', 'misc.joined': 'Регистрация', 'misc.overall': 'Общий', 'misc.top': 'Топ {n}%', 'misc.next': 'Далее'
};

const DICT: Record<string, Partial<Record<Key, string>>> = { en, es, fr, de, pt, zh, ja, ru };
export const LOCALES = Object.keys(DICT);

export function normalizeLocale(v: string | undefined): string {
  const base = (v ?? '').toLowerCase().split(/[-_]/)[0];
  return DICT[base] ? base : 'en';
}

export type Translate = (key: Key | `stat.${string}.short`, vars?: Record<string, string | number>) => string;

export function translator(locale: string): Translate {
  const d: Record<string, string | undefined> = DICT[locale] ?? {};
  const english = en as Record<string, string>;
  return (key, vars) => {
    // `stat.x.short` falls back to the locale's full label, then English short, then English full
    const full = key.replace(/\.short$/, '');
    const text = d[key] ?? (full !== key ? d[full] : undefined) ?? english[key] ?? english[full] ?? key;
    return vars ? text.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : text;
  };
}
