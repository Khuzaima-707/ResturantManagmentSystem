import React, { useState } from 'react';
import { Layers } from 'lucide-react';
import { Modal } from '../../../components/ui/Modal';
import { FormField } from '../../../components/ui/FormField';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { useAppStore } from '../../../store';
import { isDuplicateCategoryName } from '../../../domain/rules';

const CategoryModalForm = ({
  isOpen,
  onClose,
  category = null,
}) => {
  const { categories, addCategory, updateCategory } = useAppStore();
  const isEdit = Boolean(category?.id);

  const [name, setName] = useState(category?.name || '');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Category name is required';
    } else if (isDuplicateCategoryName(name, categories, category?.id)) {
      errs.name = 'A category with this name already exists';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!validate()) return;

    const trimmed = name.trim();
    const slug = trimmed
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    if (isEdit) {
      updateCategory(category.id, {
        name: trimmed,
        slug,
      });
    } else {
      addCategory({
        name: trimmed,
        slug,
        status: 'active',
        defaultUnitType: 'piece',
        baseUnit: 'piece',
        keywords: [trimmed.toLowerCase()],
        defaultPortions: [],
        defaultAddonIds: [],
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Category' : 'Add Category'}
      icon={Layers}
      maxWidth="max-w-md"
      footer={
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="secondary" size="md" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" size="md" onClick={handleSubmit} type="button">
            {isEdit ? 'Update Category' : 'Add Category'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 py-1">
        <FormField label="Category Name" required error={errors.name}>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors({ ...errors, name: null });
            }}
            placeholder="Enter category name..."
            autoFocus
          />
        </FormField>
      </form>
    </Modal>
  );
};

export const CategoryModal = ({ isOpen, onClose, category = null }) => {
  if (!isOpen) return null;
  return (
    <CategoryModalForm
      key={category?.id || 'new_category'}
      isOpen={isOpen}
      onClose={onClose}
      category={category}
    />
  );
};

export default CategoryModal;
