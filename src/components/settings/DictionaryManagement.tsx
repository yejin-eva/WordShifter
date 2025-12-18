import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { getLanguageName, LanguageCode, LANGUAGE_PAIRS } from '@/constants/languages'
import { dictionaryService } from '@/services/dictionary/dictionaryService'

type DictRow = {
  key: string
  source: LanguageCode
  target: LanguageCode
  cached: boolean
  loading: boolean
  entryCount?: number
  updatedAt?: Date
}

function makeKey(source: string, target: string) {
  return `${source}-${target}`
}

export function DictionaryManagement() {
  const availablePairs = useMemo(() => LANGUAGE_PAIRS, [])
  const [rows, setRows] = useState<DictRow[]>([])

  const refresh = useCallback(async () => {
    const cached = await dictionaryService.listCached()
    const cachedMap = new Map(cached.map((c) => [c.key, c]))

    setRows((prev) => {
      const loadingMap = new Map(prev.map((r) => [r.key, r.loading]))
      return availablePairs.map((p) => {
        const key = makeKey(p.source, p.target)
        const c = cachedMap.get(key)
        return {
          key,
          source: p.source,
          target: p.target,
          cached: Boolean(c),
          loading: loadingMap.get(key) ?? false,
          entryCount: c?.entryCount,
          updatedAt: c?.updatedAt,
        }
      })
    })
  }, [availablePairs])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const setLoading = useCallback((key: string, loading: boolean) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, loading } : r)))
  }, [])

  const onDownload = useCallback(
    async (source: LanguageCode, target: LanguageCode) => {
      const key = makeKey(source, target)
      try {
        setLoading(key, true)
        const size = await dictionaryService.downloadDictionary({ source, target })
        toast.success(`Downloaded ${key} (${size.toLocaleString()} entries)`)
      } catch (e) {
        toast.error(`Failed to download ${key}`)
        console.error(e)
      } finally {
        setLoading(key, false)
        await refresh()
      }
    },
    [refresh, setLoading]
  )

  const onRemove = useCallback(
    async (source: LanguageCode, target: LanguageCode) => {
      const key = makeKey(source, target)
      try {
        setLoading(key, true)
        await dictionaryService.removeCachedDictionary({ source, target })
        toast.success(`Removed ${key} from offline cache`)
      } catch (e) {
        toast.error(`Failed to remove ${key}`)
        console.error(e)
      } finally {
        setLoading(key, false)
        await refresh()
      }
    },
    [refresh, setLoading]
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Download dictionaries for offline use. If you don’t download, WordShift will still try to load them from the app
        bundle when needed.
      </p>

      <div className="space-y-2">
        {rows.map((r) => {
          const title = `${getLanguageName(r.source)} → ${getLanguageName(r.target)}`
          return (
            <div
              key={r.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="font-medium text-gray-900 dark:text-white truncate">{title}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {r.cached ? (
                    <>
                      Cached • {r.entryCount?.toLocaleString() ?? '—'} entries
                      {r.updatedAt ? ` • updated ${r.updatedAt.toLocaleString()}` : ''}
                    </>
                  ) : (
                    'Not cached'
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!r.cached ? (
                  <button
                    disabled={r.loading}
                    onClick={() => void onDownload(r.source, r.target)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm"
                  >
                    {r.loading ? 'Downloading…' : 'Download'}
                  </button>
                ) : (
                  <button
                    disabled={r.loading}
                    onClick={() => void onRemove(r.source, r.target)}
                    className="px-3 py-1.5 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:bg-gray-200 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white text-sm"
                  >
                    {r.loading ? 'Removing…' : 'Remove'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


