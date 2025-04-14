import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchNotes } from '../../features/notes/noteSlice';
import Button from '../common/Button';

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
    <form
      onSubmit={handleSearch}
      className="flex flex-wrap items-center gap-3 mb-6 bg-[#23242B] rounded-2xl shadow-2xl px-6 py-4"
    >
      <div className="flex flex-1 gap-2">
        <input
          type="text"
          className="flex-1 bg-[#181A20] text-[#F8FAFC] placeholder-[#C7C9D1] border border-[#393A41] rounded-full px-4 py-2 shadow focus:ring-2 focus:ring-accent-purple focus:border-accent-purple transition"
          placeholder="Search notes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Search notes"
        />
        <input
          type="text"
          className="w-40 bg-[#181A20] text-[#F8FAFC] placeholder-[#C7C9D1] border border-[#393A41] rounded-full px-4 py-2 shadow focus:ring-2 focus:ring-accent-purple focus:border-accent-purple transition"
          placeholder="Tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          aria-label="Filter by tag"
        />
      </div>
      <Button type="submit" className="ml-2" variant="primary">
        Filter
      </Button>
      <select
        className="ml-2 bg-[#181A20] text-[#F8FAFC] border border-[#393A41] rounded-full px-4 py-2 shadow focus:ring-2 focus:ring-accent-purple focus:border-accent-purple transition"
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
          Grid
        </Button>
        <Button
          type="button"
          variant={view === 'list' ? 'primary' : 'secondary'}
          className="px-4"
          onClick={() => setView('list')}
          aria-label="List view"
        >
          List
        </Button>
      </div>
    </form>
  );
};

export default FilterBar;
