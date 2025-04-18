import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchNotes } from '../../features/notes/noteSlice';
import Button from '../common/Button';
import { Search, Grid, List } from 'lucide-react';
import Card from '../common/Card';

const SORT_OPTIONS = [
  { value: '-updatedAt', label: 'Last Updated' },
  { value: 'title', label: 'Title (A-Z)' },
  { value: '-createdAt', label: 'Created (Newest)' },
  { value: 'createdAt', label: 'Created (Oldest)' },
];

const FilterBar = ({ view, setView }) => {
  const dispatch = useDispatch();
  const [search, setSearch] = useState('');
  const [tag, setTag] = useState('');
  const [sort, setSort] = useState('-updatedAt');

  const handleSearch = (e) => {
    e.preventDefault();
    dispatch(fetchNotes({ search, tags: tag ? [tag] : undefined, sort }));
  };

  const handleSortChange = (e) => {
    setSort(e.target.value);
    dispatch(
      fetchNotes({
        search,
        tags: tag ? [tag] : undefined,
        sort: e.target.value,
      })
    );
  };

  return (
    <Card className="mb-6">
      <form
        onSubmit={handleSearch}
        className="flex flex-wrap items-center gap-3"
      >
        <div className="flex flex-1 gap-3">
          <div className="relative flex-grow">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-muted h-4 w-4" />
            <input
              type="text"
              className="w-full bg-dark text-text placeholder-text-muted border border-dark-600 rounded-full pl-10 pr-4 py-2 focus:ring-2 focus:ring-accent-purple focus:border-accent-purple transition"
              placeholder="Search notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search notes"
            />
          </div>

          <input
            type="text"
            className="w-40 bg-dark text-text placeholder-text-muted border border-dark-600 rounded-full px-4 py-2 focus:ring-2 focus:ring-accent-purple focus:border-accent-purple transition"
            placeholder="Tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            aria-label="Filter by tag"
          />
        </div>

        <Button type="submit" variant="primary" className="whitespace-nowrap">
          Apply Filter
        </Button>

        <select
          className="bg-dark text-text border border-dark-600 rounded-full px-4 py-2 focus:ring-2 focus:ring-accent-purple focus:border-accent-purple transition"
          value={sort}
          onChange={handleSortChange}
          aria-label="Sort notes"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Sort: {opt.label}
            </option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant={view === 'grid' ? 'primary' : 'secondary'}
            className="px-4"
            onClick={() => setView('grid')}
            aria-label="Grid view"
          >
            <Grid size={16} className="mr-1" /> Grid
          </Button>
          <Button
            type="button"
            variant={view === 'list' ? 'primary' : 'secondary'}
            className="px-4"
            onClick={() => setView('list')}
            aria-label="List view"
          >
            <List size={16} className="mr-1" /> List
          </Button>
        </div>
      </form>
    </Card>
  );
};

export default FilterBar;
