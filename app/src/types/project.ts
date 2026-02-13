export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  entryPointId: string;
  templateId?: string; // ID шаблона, по которому создан проект
}
