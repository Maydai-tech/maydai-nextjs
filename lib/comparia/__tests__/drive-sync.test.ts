import { resolveCompariaDriveFileName } from '../drive-sync'

describe('Compar:IA Drive sync helpers', () => {
  const previous = process.env.COMPARIA_DRIVE_FILE_NAME

  afterEach(() => {
    if (previous == null) delete process.env.COMPARIA_DRIVE_FILE_NAME
    else process.env.COMPARIA_DRIVE_FILE_NAME = previous
  })

  test('prefers an explicit file name, then env, then leaderboard.csv', () => {
    delete process.env.COMPARIA_DRIVE_FILE_NAME
    expect(resolveCompariaDriveFileName()).toBe('leaderboard.csv')
    process.env.COMPARIA_DRIVE_FILE_NAME = 'comparia.csv'
    expect(resolveCompariaDriveFileName()).toBe('comparia.csv')
    expect(resolveCompariaDriveFileName(' custom.csv ')).toBe('custom.csv')
  })
})
