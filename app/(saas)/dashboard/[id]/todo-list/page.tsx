import TodoListPage from './TodoListPage'

interface TodoListProps {
  params: Promise<{ id: string }>
}

export default function TodoList({ params }: TodoListProps) {
  return <TodoListPage params={params} />
}
