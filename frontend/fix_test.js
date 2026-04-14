const prevDeps = useRef({ debouncedSearch, filters, sort })
useEffect(() => {
  const depsChanged = 
    prevDeps.current.debouncedSearch !== debouncedSearch ||
    prevDeps.current.filters !== filters ||
    prevDeps.current.sort !== sort;
    
  if (depsChanged) {
    setPage(1)
    prevDeps.current = { debouncedSearch, filters, sort }
  }
}, [debouncedSearch, filters, sort])
